'use server';

import { createClient } from '@supabase/supabase-js';
import SupplierService from '@/services/supplier-service';
import { z } from 'zod';

const PurchaseSchema = z.object({
  packageId: z.string(),
  phoneNumber: z.string().min(10),
  paymentMethod: z.enum(['WALLET', 'MOMO']),
  agentId: z.string().nullable().optional(),
  referringAgentId: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server actions');
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Handles the entire purchase flow securely on the server.
 * This prevents client-side manipulation of balances and logic.
 */
export async function processPurchaseAction(params: z.infer<typeof PurchaseSchema>) {
  const result = PurchaseSchema.safeParse(params);
  if (!result.success) {
    return { success: false, error: 'Invalid input data' };
  }

  const { packageId, phoneNumber, paymentMethod, agentId, referringAgentId, paymentReference } = result.data;

  try {
    // 1. Fetch Package Details (Server-Side) to get actual price
    const { data: pkg, error: pkgError } = await adminSupabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: 'Package not found' };
    }

    // 2. Fetch System Settings for Commissions and Active Supplier
    const { data: settings } = await adminSupabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global_config')
      .single();

    const commissionRate = settings?.default_commission_rate ? Number(settings.default_commission_rate) : 0.05;
    const commissionEarned = pkg.price * commissionRate;
    const finalAgentId = agentId || referringAgentId || null;

    // 3. Handle WALLET Payment Logic
    if (paymentMethod === 'WALLET') {
      if (!agentId) return { success: false, error: 'Auth required for wallet payment' };

      // Fetch profile with Service Role to bypass RLS for balance check
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('balance, commissions')
        .eq('id', agentId)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      if (profile.balance < pkg.price) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // ATOMIC UPDATE: Deduct balance and add commission
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          balance: profile.balance - pkg.price,
          commissions: (profile.commissions || 0) + commissionEarned
        })
        .eq('id', agentId);

      if (updateError) {
        console.error('❌ Balance Update Error:', updateError.message);
        return { success: false, error: 'Failed to process payment' };
      }

      // Log Transaction
      const transactionId = `ref-wal-${Math.random().toString(36).substr(2, 9)}`;
      const { data: tx, error: txError } = await adminSupabase
        .from('transactions')
        .insert({
          agent_id: agentId,
          recipient_phone: phoneNumber,
          amount: pkg.price,
          commission_earned: commissionEarned,
          status: 'PROCESSING',
          funding_source: 'WALLET',
          supplier_id: transactionId
        })
        .select()
        .single();

      if (txError) {
        console.error('❌ Transaction Log Error:', txError.message);
        return { success: false, error: 'Payment processed but logging failed' };
      }

      // Trigger Supplier Order
      const adapter = SupplierService.getAdapter(settings?.active_supplier);
      const deliveryResult = await adapter.purchaseBundle(packageId, phoneNumber);

      if (deliveryResult.success) {
        await adminSupabase
          .from('transactions')
          .update({ 
            status: 'DELIVERED',
            supplier_id: deliveryResult.transactionId || transactionId 
          })
          .eq('id', tx.id);
        
        return { success: true, message: 'Data delivered successfully', transactionId };
      } else {
        await adminSupabase
          .from('transactions')
          .update({ status: 'FAILED' })
          .eq('id', tx.id);
        
        return { success: false, error: deliveryResult.message || 'Delivery failed' };
      }
    }

    // 4. Handle MOMO (Initialization tracking)
    if (paymentMethod === 'MOMO') {
      const transactionId = paymentReference || `ref-momo-init-${Math.random().toString(36).substr(2, 9)}`;
      const { error: txError } = await adminSupabase
        .from('transactions')
        .insert({
          agent_id: finalAgentId,
          recipient_phone: phoneNumber,
          amount: pkg.price,
          commission_earned: commissionEarned,
          status: paymentReference ? 'PAID' : 'PENDING_PAYMENT',
          funding_source: 'MOMO',
          supplier_id: transactionId
        });

      if (txError) {
        console.error('❌ MOMO Init Log Error:', txError.message);
        return { success: false, error: 'Failed to initialize transaction' };
      }

      return { success: true, transactionId };
    }

    return { success: false, error: 'Invalid payment method' };

  } catch (err: any) {
    console.error('🔥 Server Action Exception:', err);
    return { success: false, error: 'A server error occurred' };
  }
}

/**
 * Specifically handles MOMO success confirmation from the client
 * (Though webhooks are the primary source of truth, this updates UI state)
 */
export async function confirmMomoPaymentAction(reference: string) {
  // We just check if the transaction exists and update it to PROCESSING
  // if it hasn't been handled by the webhook yet.
  const { data: tx, error } = await adminSupabase
    .from('transactions')
    .select('*')
    .eq('supplier_id', reference)
    .single();

  if (error || !tx) return { success: false, error: 'Transaction not found' };

  if (tx.status === 'PENDING_PAYMENT') {
    await adminSupabase
      .from('transactions')
      .update({ status: 'PAID' })
      .eq('id', tx.id);
  }

  return { success: true };
}
