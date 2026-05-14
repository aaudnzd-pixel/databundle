import { SupplierAdapter, DataPackage, PurchaseResponse } from '@/types/supplier';

export class BundleCornerSupplierAdapter implements SupplierAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.bundlecorner.com/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async getPackages(): Promise<DataPackage[]> {
    try {
      const data = await this.fetchWithAuth('/bundles');
      return data.map((pkg: any) => ({
        id: pkg.id,
        supplier: pkg.network.toUpperCase(),
        dataAmount: pkg.volume,
        name: pkg.name,
        price: Number(pkg.price),
        validity: '30 Days' // Defaulting to 30 days as per common standards
      }));
    } catch (error) {
      console.error('BundleCorner Fetch Error:', error);
      return [];
    }
  }

  async purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse> {
    try {
      // 1. Check Balance First (Bounce Logic)
      const balanceData = await this.getBalance();
      
      // We'd ideally need the package price here, but getPackages handles that mapping.
      // For now, the API handles the balance check itself and returns 402 if low.
      
      const data = await this.fetchWithAuth('/orders', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: packageId,
          phoneNumber: phoneNumber,
        }),
      });

      return {
        success: data.status === 'success',
        transactionId: data.orderId,
        message: data.message
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        message: error.message || 'Transaction failed'
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const data = await this.fetchWithAuth('/balance');
      return Number(data.balance);
    } catch (error) {
      console.error('BundleCorner Balance Error:', error);
      return 0;
    }
  }
}
