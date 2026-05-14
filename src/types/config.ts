export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  name: string;
  version: string;
  environment: Environment;
  isDev: boolean;
}

export interface SupplierConfig {
  activeSupplier: string;
  mockEnabled: boolean;
}

export interface CommissionConfig {
  defaultRate: number; // e.g., 0.05 for 5%
}

export interface PaystackConfig {
  publicKey: string;
}

export interface Config {
  app: AppConfig;
  supplier: SupplierConfig;
  commissions: CommissionConfig;
  paystack: PaystackConfig;
}
