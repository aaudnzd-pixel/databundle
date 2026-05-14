import { Config, Environment } from '@/types/config';

const env = (process.env.NODE_ENV || 'development') as Environment;

export const config: Config = {
  app: {
    name: 'Databundle',
    version: '0.1.0',
    environment: env,
    isDev: env === 'development',
  },
  supplier: {
    activeSupplier: process.env.NEXT_PUBLIC_ACTIVE_SUPPLIER || 'MOCK',
    mockEnabled: process.env.NEXT_PUBLIC_MOCK_SUPPLIER === 'true' || env === 'development',
  },
  commissions: {
    defaultRate: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_COMMISSION_RATE || '0.05'),
  },
  paystack: {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
  },
};

export default config;
