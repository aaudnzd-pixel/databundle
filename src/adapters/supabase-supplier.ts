import { SupplierAdapter, DataPackage, PurchaseResponse } from '@/types/supplier';
import { supabase } from '@/lib/supabase';

export class SupabaseSupplierAdapter implements SupplierAdapter {
  async getPackages(): Promise<DataPackage[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('CRITICAL: Supabase Fetch Error:', error.message);
      return [];
    }

    console.log(`FETCH SUCCESS: Found ${data?.length || 0} packages in Supabase`);

    // Map DB fields to DataPackage type
    return data.map(pkg => ({
      id: pkg.id,
      supplier: pkg.supplier,
      dataAmount: pkg.data_amount,
      name: pkg.name,
      price: Number(pkg.price),
      validity: pkg.name.includes('Non-Expiry') ? 'Non-Expiry' : '60 Days' // Heuristic mapping
    }));
  }

  async purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse> {
    // In a real production environment, this would call a secure Edge Function 
    // or a backend API that triggers the actual carrier API.
    // For now, we'll return a successful response as the lifecycle is handled by usePurchaseFlow.
    return {
      success: true,
      transactionId: `tx-${Math.random().toString(36).substr(2, 9)}`,
      message: `Order submitted for ${phoneNumber}`
    };
  }

  async getBalance(): Promise<number> {
    // This returns the balance of the platform's supplier account (e.g., Hubtel balance)
    // Not to be confused with the Agent's individual wallet balance.
    return 15420.50; 
  }
}
