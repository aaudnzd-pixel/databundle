'use client';

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TrackingService } from '@/services/tracking-service';
import { OrderDetails, OrderStatus } from '@/types/tracking';

export default function TrackPage() {
  const [transactionId, setTransactionId] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId) return;

    setLoading(true);
    setSearched(true);
    try {
      const result = await TrackingService.getOrderStatus(transactionId);
      setOrder(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-100';
      case 'PROCESSING': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'PENDING': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'FAILED': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 size={20} />;
      case 'PROCESSING': return <Loader2 size={20} className="animate-spin" />;
      case 'PENDING': return <Clock size={20} />;
      case 'FAILED': return <AlertCircle size={20} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-3">Track Your Order</h1>
          <p className="text-slate-500">Enter your transaction ID to check the status of your data bundle.</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. tx-xxxxxxxxx"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400" />
            </div>
            <button
              type="submit"
              disabled={loading || !transactionId}
              className="absolute inset-y-2 right-2 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Track'}
            </button>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="font-medium">Searching for your order...</p>
          </div>
        ) : searched && order ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order Details</span>
              <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                {order.status}
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Package</label>
                  <p className="font-bold text-slate-900">{order.packageName}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price</label>
                  <p className="font-bold text-slate-900">GH₵ {order.amount}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recipient</label>
                  <p className="font-bold text-slate-900">{order.phoneNumber}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Network</label>
                  <p className="font-bold text-slate-900">{order.supplier}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction ID</label>
                <p className="font-mono text-sm text-slate-600 break-all">{order.transactionId}</p>
              </div>

              <div className="text-[10px] text-center text-slate-400 font-medium">
                Last updated: {new Date(order.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        ) : searched && !loading && (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Order Not Found</h3>
            <p className="text-sm text-slate-500">We couldn't find an order with that transaction ID. Please check and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
