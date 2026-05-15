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
    activeSupplier: 'MOCK', // Defaulting to MOCK for now, change to BUNDLECORNER when live
    mockEnabled: true,
    bundleCornerKey: process.env.BUNDLECORNER_API_KEY || '',
  },
  commissions: {
    defaultRate: 0.05, // Fixed 5% default
  },
  paystack: {
    publicKey: (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '').trim(),
  },
};

// Log warning if key is missing in development
if (!config.paystack.publicKey && typeof window !== 'undefined') {
  console.warn('⚠️ Paystack Public Key is missing! Check your environment variables.');
}

export default config;
