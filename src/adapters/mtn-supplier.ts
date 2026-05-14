import { SupplierAdapter, DataPackage, PurchaseResponse } from '@/types/supplier';

export class MtnSupplierAdapter implements SupplierAdapter {
  async getPackages(): Promise<DataPackage[]> {
    // In a real implementation, this would fetch from MTN API
    return [
      { id: 'mtn-1', name: 'MTN Mashup 1', dataAmount: '1GB', price: 10, validity: '30 days', supplier: 'MTN' },
      { id: 'mtn-2', name: 'MTN Mashup 2', dataAmount: '5GB', price: 45, validity: '30 days', supplier: 'MTN' },
      { id: 'mtn-3', name: 'MTN Turbo', dataAmount: '20GB', price: 150, validity: '30 days', supplier: 'MTN' },
    ];
  }

  async purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse> {
    console.log(`MTN Purchase: ${packageId} for ${phoneNumber}`);
    return { success: true, message: 'MTN purchase initiated', transactionId: `mtn-${Date.now()}` };
  }
}
