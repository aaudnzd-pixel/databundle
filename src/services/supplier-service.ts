import config from '@/config';
import { SupplierAdapter } from '@/types/supplier';
import { MockSupplierAdapter } from '@/adapters/mock-supplier';
import { MtnSupplierAdapter } from '@/adapters/mtn-supplier';
import { TelecelSupplierAdapter } from '@/adapters/telecel-supplier';
import { SupabaseSupplierAdapter } from '@/adapters/supabase-supplier';
import { BundleCornerSupplierAdapter } from '@/adapters/bundlecorner-supplier';

class SupplierService {
  private static instance: SupplierAdapter | null = null;

  static getAdapter(): SupplierAdapter {
    if (this.instance) {
      return this.instance;
    }

    const supplierName = config.supplier.activeSupplier.toUpperCase();

    if (supplierName === 'BUNDLECORNER') {
      this.instance = new BundleCornerSupplierAdapter(config.supplier.bundleCornerKey);
    } else {
      // Defaulting to the Supabase-backed adapter for production-ready persistence
      this.instance = new SupabaseSupplierAdapter();
    }

    return this.instance;
  }
}

export default SupplierService;
