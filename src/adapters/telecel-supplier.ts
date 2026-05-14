import { SupplierAdapter, DataPackage, PurchaseResponse } from '@/types/supplier';

export class TelecelSupplierAdapter implements SupplierAdapter {
  async getPackages(): Promise<DataPackage[]> {
    return [
      { id: 'tele-1', name: 'Telecel Special', dataAmount: '2GB', price: 15, validity: '15 days', supplier: 'TELECEL' },
      { id: 'tele-2', name: 'Telecel Jumbo', dataAmount: '12GB', price: 80, validity: '30 days', supplier: 'TELECEL' },
    ];
  }

  async purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse> {
    console.log(`Telecel Purchase: ${packageId} for ${phoneNumber}`);
    return { success: true, message: 'Telecel purchase initiated', transactionId: `tele-${Date.now()}` };
  }
}
