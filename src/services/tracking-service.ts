import { OrderDetails, OrderStatus } from '@/types/tracking';

export class TrackingService {
  static async getOrderStatus(transactionId: string): Promise<OrderDetails | null> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // For mock purposes, if ID starts with 'tx-', return a success
    // Otherwise return null (not found)
    if (!transactionId.startsWith('tx-')) {
      return null;
    }

    const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      transactionId,
      phoneNumber: '024XXXXXXX',
      packageName: 'Mega Pack (10GB)',
      amount: 100,
      status: randomStatus,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updatedAt: new Date().toISOString(),
      supplier: 'MTN',
    };
  }
}
