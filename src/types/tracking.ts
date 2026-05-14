export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface OrderDetails {
  transactionId: string;
  phoneNumber: string;
  packageName: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  supplier: string;
}
