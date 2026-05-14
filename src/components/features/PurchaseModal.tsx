import React from 'react';
import { X, Smartphone, Loader2 } from 'lucide-react';
import { DataPackage } from '@/types/supplier';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: DataPackage | null;
  phoneNumber: string;
  onPhoneNumberChange: (val: string) => void;
  paymentMethod: 'WALLET' | 'MOMO';
  onPaymentMethodChange: (val: 'WALLET' | 'MOMO') => void;
  onConfirm: () => void;
  isProcessing: boolean;
  error: string | null;
  showWalletOption?: boolean;
  walletBalance?: string;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  pkg,
  phoneNumber,
  onPhoneNumberChange,
  paymentMethod,
  onPaymentMethodChange,
  onConfirm,
  isProcessing,
  error,
  showWalletOption = false,
  walletBalance = 'GH₵ 0.00',
}) => {
  if (!isOpen || !pkg) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Complete Purchase</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Package Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{pkg.supplier}</div>
            <div className="text-2xl font-black text-slate-900 mb-1">{pkg.dataAmount}</div>
            <div className="text-sm text-slate-600">{pkg.name} • {pkg.validity}</div>
            <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Total Price</span>
              <span className="text-lg font-bold text-blue-900">GH₵ {pkg.price}</span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Recipient Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Smartphone size={18} className="text-slate-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => onPhoneNumberChange(e.target.value)}
                  placeholder="e.g. 024XXXXXXX"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {showWalletOption && (
                  <button
                    onClick={() => onPaymentMethodChange('WALLET')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === 'WALLET' 
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 ${paymentMethod === 'WALLET' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                      <span className="text-xs font-black text-slate-900 uppercase">Wallet</span>
                    </div>
                    <p className="text-[10px] text-blue-600 font-black leading-tight mb-1">{walletBalance}</p>
                    <p className="text-[10px] text-slate-500 font-bold leading-tight">Pay from balance</p>
                  </button>
                )}
                <button
                  onClick={() => onPaymentMethodChange('MOMO')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethod === 'MOMO' 
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20' 
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  } ${!showWalletOption ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border-2 ${paymentMethod === 'MOMO' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                    <span className="text-xs font-black text-slate-900 uppercase">MoMo</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-tight">Pay via Mobile Money (Paystack)</p>
                </button>
              </div>
            </div>

            {error && <p className="mt-2 text-xs font-medium text-red-500 text-center">{error}</p>}

            <button
              onClick={onConfirm}
              disabled={isProcessing || !phoneNumber}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </button>
            
            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Securely Processed by Paystack
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
