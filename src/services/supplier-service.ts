import config from '@/config';
import { SupplierAdapter } from '@/types/supplier';
import { MockSupplierAdapter } from '@/adapters/mock-supplier';
import { MtnSupplierAdapter } from '@/adapters/mtn-supplier';
import { TelecelSupplierAdapter } from '@/adapters/telecel-supplier';
import { SupabaseSupplierAdapter } from '@/adapters/supabase-supplier';
import { BundleCornerSupplierAdapter } from '@/adapters/bundlecorner-supplier';

class SupplierService {
  private static instance: SupplierAdapter | null = null;

  static getAdapter(forcedSupplier?: string): SupplierAdapter {
    const supplierName = (forcedSupplier || config.supplier.activeSupplier).toUpperCase();

    if (supplierName === 'BUNDLECORNER') {
      return new BundleCornerSupplierAdapter(config.supplier.bundleCornerKey);
    }
    
    // Defaulting to the Supabase-backed adapter for production-ready persistence
    return new SupabaseSupplierAdapter();
  }
}

export default SupplierService;
