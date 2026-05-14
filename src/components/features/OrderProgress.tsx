import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export type OrderStep = 'PAID' | 'PENDING' | 'DELIVERED';

interface OrderProgressProps {
  currentStep: OrderStep;
}

export const OrderProgress: React.FC<OrderProgressProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-md mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-blue-600/5 relative overflow-hidden">
        
        {/* Progress Line Container */}
        <div className="absolute top-[44px] left-12 right-12 h-[3px] bg-slate-100 -z-0">
          <div 
            className="h-full bg-blue-600 transition-all duration-1000 ease-out"
            style={{ 
              width: currentStep === 'PAID' ? '0%' : 
                     currentStep === 'PENDING' ? '50%' : '100%' 
            }}
          />
        </div>

        <div className="flex justify-between relative z-10">
          {/* Step 1: Paid */}
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
              ['PAID', 'PENDING', 'DELIVERED'].includes(currentStep) 
                ? 'bg-blue-600 text-white border-4 border-blue-100' : 'bg-slate-50 text-slate-300'
            }`}>
              <CheckCircle2 size={18} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Paid</span>
          </div>

          {/* Step 2: Pending */}
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
              ['PENDING', 'DELIVERED'].includes(currentStep) 
                ? 'bg-blue-600 text-white border-4 border-blue-100' : 'bg-white border-2 border-slate-100 text-slate-300'
            }`}>
              {currentStep === 'PENDING' ? (
                <Loader2 size={18} strokeWidth={3} className="animate-spin" />
              ) : currentStep === 'DELIVERED' ? (
                <CheckCircle2 size={18} strokeWidth={3} />
              ) : (
                <Circle size={18} strokeWidth={2} />
              )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              currentStep === 'PENDING' ? 'text-blue-600' : 'text-slate-300'
            }`}>Pending</span>
          </div>

          {/* Step 3: Delivered */}
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
              currentStep === 'DELIVERED' 
                ? 'bg-green-600 text-white border-4 border-green-100 animate-bounce-short' : 'bg-white border-2 border-slate-100 text-slate-300'
            }`}>
              {currentStep === 'DELIVERED' ? (
                <CheckCircle2 size={18} strokeWidth={3} />
              ) : (
                <Circle size={18} strokeWidth={2} />
              )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              currentStep === 'DELIVERED' ? 'text-green-600 font-black' : 'text-slate-300'
            }`}>Delivered</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-bold text-slate-500">
            {currentStep === 'PAID' && 'Payment confirmed! Connecting to supplier...'}
            {currentStep === 'PENDING' && 'Processing your data bundle...'}
            {currentStep === 'DELIVERED' && 'Bundle delivered successfully! 🎉'}
          </p>
        </div>
      </div>
    </div>
  );
};
