import { SupplierAdapter, DataPackage, PurchaseResponse } from '@/types/supplier';

export class MockSupplierAdapter implements SupplierAdapter {
  private mockPackages: DataPackage[] = [
    // MTN Data Plans (Non-Expiry)
    { id: 'mtn-1gb', name: 'MTN Non-Expiry', dataAmount: '1GB', price: 4.80, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-2gb', name: 'MTN Non-Expiry', dataAmount: '2GB', price: 9.60, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-3gb', name: 'MTN Non-Expiry', dataAmount: '3GB', price: 13.90, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-4gb', name: 'MTN Non-Expiry', dataAmount: '4GB', price: 19.50, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-5gb', name: 'MTN Non-Expiry', dataAmount: '5GB', price: 24.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-6gb', name: 'MTN Non-Expiry', dataAmount: '6GB', price: 28.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-8gb', name: 'MTN Non-Expiry', dataAmount: '8GB', price: 36.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-10gb', name: 'MTN Non-Expiry', dataAmount: '10GB', price: 42.80, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-15gb', name: 'MTN Non-Expiry', dataAmount: '15GB', price: 63.80, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-20gb', name: 'MTN Non-Expiry', dataAmount: '20GB', price: 83.80, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-25gb', name: 'MTN Non-Expiry', dataAmount: '25GB', price: 104.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-30gb', name: 'MTN Non-Expiry', dataAmount: '30GB', price: 125.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-40gb', name: 'MTN Non-Expiry', dataAmount: '40GB', price: 165.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-50gb', name: 'MTN Non-Expiry', dataAmount: '50GB', price: 205.00, validity: 'Non-Expiry', supplier: 'MTN' },
    { id: 'mtn-100gb', name: 'MTN Non-Expiry', dataAmount: '100GB', price: 404.50, validity: 'Non-Expiry', supplier: 'MTN' },

    // Telecel Data Plans (60 Days)
    { id: 'tele-10gb', name: 'Telecel 60 Days', dataAmount: '10GB', price: 41.85, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-15gb', name: 'Telecel 60 Days', dataAmount: '15GB', price: 62.50, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-20gb', name: 'Telecel 60 Days', dataAmount: '20GB', price: 79.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-25gb', name: 'Telecel 60 Days', dataAmount: '25GB', price: 103.50, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-30gb', name: 'Telecel 60 Days', dataAmount: '30GB', price: 124.50, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-35gb', name: 'Telecel 60 Days', dataAmount: '35GB', price: 145.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-40gb', name: 'Telecel 60 Days', dataAmount: '40GB', price: 166.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-45gb', name: 'Telecel 60 Days', dataAmount: '45GB', price: 186.50, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-50gb', name: 'Telecel 60 Days', dataAmount: '50GB', price: 207.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-70gb', name: 'Telecel 60 Days', dataAmount: '70GB', price: 290.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-80gb', name: 'Telecel 60 Days', dataAmount: '80GB', price: 331.50, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-100gb', name: 'Telecel 60 Days', dataAmount: '100GB', price: 414.00, validity: '60 Days', supplier: 'TELECEL' },
    { id: 'tele-200gb', name: 'Telecel 60 Days', dataAmount: '200GB', price: 828.00, validity: '60 Days', supplier: 'TELECEL' },

    // AirtelTigo Data Plans (60 Days)
    { id: 'at-1gb', name: 'AirtelTigo 60 Days', dataAmount: '1GB', price: 4.90, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-2gb', name: 'AirtelTigo 60 Days', dataAmount: '2GB', price: 9.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-3gb', name: 'AirtelTigo 60 Days', dataAmount: '3GB', price: 13.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-4gb', name: 'AirtelTigo 60 Days', dataAmount: '4GB', price: 17.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-5gb', name: 'AirtelTigo 60 Days', dataAmount: '5GB', price: 22.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-6gb', name: 'AirtelTigo 60 Days', dataAmount: '6GB', price: 25.40, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-7gb', name: 'AirtelTigo 60 Days', dataAmount: '7GB', price: 28.70, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-8gb', name: 'AirtelTigo 60 Days', dataAmount: '8GB', price: 33.90, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-9gb', name: 'AirtelTigo 60 Days', dataAmount: '9GB', price: 37.90, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-10gb', name: 'AirtelTigo 60 Days', dataAmount: '10GB', price: 42.90, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-12gb', name: 'AirtelTigo 60 Days', dataAmount: '12GB', price: 52.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-15gb', name: 'AirtelTigo 60 Days', dataAmount: '15GB', price: 61.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-20gb', name: 'AirtelTigo 60 Days', dataAmount: '20GB', price: 81.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-25gb', name: 'AirtelTigo 60 Days', dataAmount: '25GB', price: 101.00, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-30gb', name: 'AirtelTigo 60 Days', dataAmount: '30GB', price: 120.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-40gb', name: 'AirtelTigo 60 Days', dataAmount: '40GB', price: 162.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-50gb', name: 'AirtelTigo 60 Days', dataAmount: '50GB', price: 198.50, validity: '60 Days', supplier: 'AIRTEL_TIGO' },
    { id: 'at-100gb', name: 'AirtelTigo 60 Days', dataAmount: '100GB', price: 396.00, validity: '60 Days', supplier: 'AIRTEL_TIGO' },

    // AirtelTigo BigTime Data Plans (Non-Expiry)
    { id: 'at-bt-20gb', name: 'AT BigTime Non-Expiry', dataAmount: '20GB', price: 75.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-30gb', name: 'AT BigTime Non-Expiry', dataAmount: '30GB', price: 95.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-40gb', name: 'AT BigTime Non-Expiry', dataAmount: '40GB', price: 115.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-50gb', name: 'AT BigTime Non-Expiry', dataAmount: '50GB', price: 129.50, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-60gb', name: 'AT BigTime Non-Expiry', dataAmount: '60GB', price: 165.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-80gb', name: 'AT BigTime Non-Expiry', dataAmount: '80GB', price: 195.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-100gb', name: 'AT BigTime Non-Expiry', dataAmount: '100GB', price: 225.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-200gb', name: 'AT BigTime Non-Expiry', dataAmount: '200GB', price: 445.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
    { id: 'at-bt-500gb', name: 'AT BigTime Non-Expiry', dataAmount: '500GB', price: 1089.00, validity: 'Non-Expiry', supplier: 'AIRTEL_TIGO' },
  ];

  async getPackages(): Promise<DataPackage[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.mockPackages;
  }

  async purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pkg = this.mockPackages.find((p) => p.id === packageId);
    if (!pkg) {
      return { success: false, message: 'Package not found' };
    }

    return {
      success: true,
      transactionId: `tx-${Math.random().toString(36).substr(2, 9)}`,
      message: `Successfully purchased ${pkg.name} for ${phoneNumber}`,
    };
  }

  async getBalance(): Promise<number> {
    return 1000.5;
  }
}
