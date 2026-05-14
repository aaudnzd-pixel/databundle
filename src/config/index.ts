import { Config, Environment } from '@/types/config';

const env = (process.env.NODE_ENV || 'development') as Environment;

export const config: Config = {
  app: {
    name: 'Databundle',
    version: '0.1.0',
    environment: 'production',
    isDev: false,
  },
  supplier: {
    activeSupplier: 'MOCK', // Defaulting to MOCK for now, change to HUBTEL when live
    mockEnabled: true,
  },
  commissions: {
    defaultRate: 0.05, // Fixed 5% default
  },
  paystack: {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  },
};

export default config;
