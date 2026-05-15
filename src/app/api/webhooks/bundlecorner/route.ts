import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for bypassing RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('🔔 Bundle Corner Webhook Received:', body);

    // Expected fields from Bundle Corner: orderId, status
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    // Map supplier status to our internal status
    let internalStatus: 'DELIVERED' | 'FAILED' | 'PROCESSING';
    const s = status.toLowerCase();

    if (s === 'success' || s === 'completed' || s === 'delivered') {
      internalStatus = 'DELIVERED';
    } else if (s === 'failed' || s === 'cancelled' || s === 'rejected' || s === 'refunded') {
      internalStatus = 'FAILED';
    } else {
      internalStatus = 'PROCESSING';
    }

    // Update the transaction
    const { error: updateError } = await adminSupabase
      .from('transactions')
      .update({ status: internalStatus })
      .eq('supplier_id', orderId);

    if (updateError) {
      console.error('❌ BundleCorner Webhook DB Error:', updateError.message);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.log(`✅ Transaction ${orderId} updated to ${internalStatus}`);
    return NextResponse.json({ status: 'success', updatedTo: internalStatus });

  } catch (err: any) {
    console.error('BundleCorner Webhook Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
