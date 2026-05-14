export interface DataPackage {
  id: string;
  name: string;
  dataAmount: string; // e.g., "1GB"
  price: number;
  validity: string; // e.g., "30 days"
  supplier: string;
}

export interface PurchaseResponse {
  success: boolean;
  transactionId?: string;
  message: string;
}

export interface SupplierAdapter {
  getPackages(): Promise<DataPackage[]>;
  purchaseBundle(packageId: string, phoneNumber: string): Promise<PurchaseResponse>;
  getBalance?(): Promise<number>;
}
