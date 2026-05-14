import React from 'react';
import { Smartphone, Zap, ShieldCheck } from 'lucide-react';
import SupplierService from '@/services/supplier-service';
import { PackageList } from '@/components/features/PackageList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const adapter = SupplierService.getAdapter();
  const packages = await adapter.getPackages();

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="px-4 pt-12 pb-8 text-center bg-white border-b border-slate-100">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          Data Bundles, <br />
          <span className="text-blue-600">Simplified.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-md mx-auto mb-8">
          The fastest way to buy data bundles for MTN, Telecel, and AirtelTigo in Ghana.
        </p>
        
        {/* Interactive Package List */}
        <PackageList initialPackages={packages} />
      </section>

      {/* Trust Pillars */}
      <section className="px-6 py-12 grid grid-cols-1 gap-8 max-w-screen-xl mx-auto">
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Zap size={24} />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Instant Delivery</h3>
          <p className="text-sm text-slate-500">Bundles are credited to your phone number within seconds.</p>
        </div>

        <div className="flex flex-col items-center text-center p-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Secure Payment</h3>
          <p className="text-sm text-slate-500">All transactions are processed securely via Paystack.</p>
        </div>

      </section>
    </div>
  );
}
