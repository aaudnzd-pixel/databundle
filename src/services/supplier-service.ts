import config from '@/config';
import { SupplierAdapter } from '@/types/supplier';
import { MockSupplierAdapter } from '@/adapters/mock-supplier';
import { MtnSupplierAdapter } from '@/adapters/mtn-supplier';
import { TelecelSupplierAdapter } from '@/adapters/telecel-supplier';
import { SupabaseSupplierAdapter } from '@/adapters/supabase-supplier';

class SupplierService {
  private static instance: SupplierAdapter | null = null;

  static getAdapter(): SupplierAdapter {
    if (this.instance) {
      return this.instance;
    }

    const supplierName = config.supplier.activeSupplier.toUpperCase();

    // In the future, we will have a RealAggregatorAdapter
    // For now, we use Mock for development
    // Using the Supabase-backed adapter for production-ready persistence
    this.instance = new SupabaseSupplierAdapter();

    return this.instance;
  }
}

export default SupplierService;
