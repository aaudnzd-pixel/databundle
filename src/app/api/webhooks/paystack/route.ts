import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import SupplierService from '@/services/supplier-service';

// Admin client for bypassing RLS in webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // 1. Verify Signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('CRITICAL: PAYSTACK_SECRET_KEY is missing');
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parse Event
    const event = JSON.parse(body);
    console.log('🔔 Paystack Webhook Received:', event.event);

    if (event.event === 'charge.success') {
      const { reference, metadata, amount, status } = event.data;
      const { packageId, recipient, agentId, referringAgentId, type, packageName } = metadata || {};

      // 3. Check if transaction already exists and is delivered
      const { data: existingTx } = await adminSupabase
        .from('transactions')
        .select('*')
        .eq('supplier_id', reference)
        .single();

      if (existingTx && existingTx.status === 'DELIVERED') {
        console.log('✅ Transaction already delivered:', reference);
        return NextResponse.json({ status: 'already_processed' });
      }

      // 4. Create or Update Transaction
      const commissionRate = 0.05; 
      const commissionEarned = (amount / 100) * commissionRate;

      const txData = {
        agent_id: (agentId && agentId !== 'GUEST') ? agentId : (referringAgentId || null),
        recipient_phone: recipient,
        amount: amount / 100,
        commission_earned: commissionEarned,
        status: 'PROCESSING', 
        funding_source: 'MOMO',
        supplier_id: reference
      };

      let transactionId: string;

      if (existingTx) {
        const { error: updateError } = await adminSupabase
          .from('transactions')
          .update(txData)
          .eq('id', existingTx.id);
        
        if (updateError) {
          console.error('❌ Webhook Update Error:', updateError.message);
          return NextResponse.json({ error: 'Update error' }, { status: 500 });
        }
        transactionId = existingTx.id;
      } else {
        const { data: newTx, error: insertError } = await adminSupabase
          .from('transactions')
          .insert(txData)
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Webhook Insert Error:', insertError.message);
          return NextResponse.json({ error: 'Insert error' }, { status: 500 });
        }
        transactionId = newTx.id;
      }

      // 5. Trigger Data Delivery
      try {
        const adapter = SupplierService.getAdapter();
        const deliveryResult = await adapter.purchaseBundle(packageId, recipient);

        if (deliveryResult.success) {
          await adminSupabase
            .from('transactions')
            .update({ 
              status: 'DELIVERED',
              supplier_id: deliveryResult.transactionId || reference 
            })
            .eq('id', transactionId);
          
          console.log('🚀 Webhook: Data Delivered Successfully');
        } else {
          await adminSupabase
            .from('transactions')
            .update({ status: 'FAILED' })
            .eq('id', transactionId);
          
          console.log('⚠️ Webhook: Delivery Failed', deliveryResult.message);
        }
      } catch (deliveryErr) {
        console.error('❌ Webhook Delivery Exception:', deliveryErr);
        await adminSupabase
          .from('transactions')
          .update({ status: 'FAILED' })
          .eq('id', transactionId);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
