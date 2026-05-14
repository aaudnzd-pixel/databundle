'use client';

import React from 'react';
import { DataPackage } from '@/types/supplier';
import { usePurchaseFlow } from '@/hooks/usePurchaseFlow';
import { PurchaseModal } from './PurchaseModal';
import { useAuth } from '@/lib/auth-context';

interface PackageListProps {
  initialPackages: DataPackage[];
  isDashboard?: boolean;
}

import { OrderProgress } from './OrderProgress';

export const PackageList: React.FC<PackageListProps> = ({ initialPackages, isDashboard }) => {
  const [activeFilter, setActiveFilter] = React.useState<string>('MTN');
  
  const {
    selectedPackage,
    isModalOpen,
    phoneNumber,
    paymentMethod,
    setPaymentMethod,
    isProcessing,
    error,
    setPhoneNumber,
    openPurchaseModal,
    closePurchaseModal,
    handlePurchase,
    activeOrderStep,
  } = usePurchaseFlow();

  const { user } = useAuth();

  React.useEffect(() => {
    if (activeOrderStep === 'PAID') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeOrderStep]);

  const networks = ['MTN', 'TELECEL', 'AIRTEL_TIGO'];
  
  const filteredPackages = initialPackages.filter(pkg => pkg.supplier === activeFilter);

  return (
    <>
      {/* Order Progress Tracker */}
      {activeOrderStep && <OrderProgress currentStep={activeOrderStep} />}

      {/* Network Filter */}
      <div className={`sticky ${isDashboard ? 'top-[148px]' : 'top-16'} z-20 bg-white/95 backdrop-blur-md -mx-4 px-4 py-4 mb-8 flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-100 transition-all duration-300`}>
        {networks.map((net) => (
          <button
            key={net}
            onClick={() => setActiveFilter(net)}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeFilter === net 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200 hover:text-slate-600'
            }`}
          >
            {net.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPackages.map((pkg) => (
          <div 
            key={pkg.id} 
            onClick={() => openPurchaseModal(pkg)}
            className="p-5 bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:border-blue-400 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group active:scale-[0.98]"
          >
            <div className="text-left mb-3">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{pkg.supplier}</div>
              <div className="text-base font-black text-slate-900 leading-tight">{pkg.dataAmount}</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">{pkg.name}</div>
            </div>
            <div className="flex items-end justify-between pt-2 border-t border-slate-50">
              <div className="text-xs font-black text-slate-900">₵{pkg.price}</div>
              <div className="text-[10px] text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">Buy →</div>
            </div>
          </div>
        ))}
      </div>

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={closePurchaseModal}
        pkg={selectedPackage}
        phoneNumber={phoneNumber}
        onPhoneNumberChange={setPhoneNumber}
        paymentMethod={paymentMethod as 'WALLET' | 'MOMO'}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={handlePurchase}
        isProcessing={isProcessing}
        error={error}
        showWalletOption={!!user}
        walletBalance={`GH₵ ${user?.balance?.toLocaleString() || '0.00'}`}
      />
    </>
  );
};
