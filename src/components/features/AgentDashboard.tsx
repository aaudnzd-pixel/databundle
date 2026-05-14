import React from 'react';
import { TrendingUp, Users, Wallet, CreditCard, Globe, User } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/lib/auth-context';

export const AgentStats = ({ stats }: { stats?: any }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const displayStats = stats || {
    totalSales: 0,
    totalCommissions: 0,
    balance: user?.balance || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 max-w-7xl">
      {isAdmin ? (
        <StatCard 
          label="Global Platform Sales" 
          value={`GH₵ ${displayStats.totalSales.toLocaleString()}`} 
          icon={<Globe size={20} className="text-blue-600" />} 
          trend={{ value: '24%', isUp: true }}
        />
      ) : (
        <StatCard 
          label="Your Total Sales" 
          value={`GH₵ ${displayStats.totalSales.toLocaleString()}`} 
          icon={<TrendingUp size={20} />} 
          trend={{ value: '12%', isUp: true }}
        />
      )}
      
      <StatCard 
        label={isAdmin ? "Total Admin Commissions" : "Total Link Commissions"} 
        value={`GH₵ ${displayStats.totalCommissions.toLocaleString()}`} 
        icon={<Wallet size={20} />} 
        trend={{ value: '15%', isUp: true }}
      />
      
      <StatCard 
        label="Available Balance" 
        value={`GH₵ ${displayStats.balance.toLocaleString()}`} 
        icon={<CreditCard size={20} />} 
      />
    </div>
  );
};

export const RecentSales = ({ 
  sales = [], 
  isLoading = false,
  onViewAll, 
  onAgentClick 
}: { 
  sales?: any[],
  isLoading?: boolean,
  onViewAll?: () => void, 
  onAgentClick?: (agentId: string) => void 
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            {isAdmin ? <Globe size={18} className="text-blue-600" /> : <TrendingUp size={18} className="text-blue-600" />}
            {isAdmin ? 'Global Activity' : 'Recent Sales'}
          </h3>
          {isAdmin && <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Live transaction log</p>}
        </div>
        <button 
          onClick={onViewAll}
          className="px-4 py-2 bg-white text-slate-600 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-slate-200 hover:border-blue-600 shadow-sm"
        >
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isAdmin && <th className="px-8 py-4">Agent</th>}
              <th className="px-8 py-4">Recipient</th>
              <th className="px-8 py-4">Amount</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">Loading transactions...</td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold">No transactions yet.</td>
              </tr>
            ) : sales.map((sale) => {
              const dateObj = new Date(sale.created_at);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString() === new Date().toLocaleDateString() ? timeStr : dateObj.toLocaleDateString();
              
              return (
                <tr key={sale.id} className="text-sm group hover:bg-slate-50/50 transition-colors">
                  {isAdmin && (
                    <td className="px-8 py-6">
                      <div 
                        onClick={() => sale.agent_id && onAgentClick?.(sale.agent_id)}
                        className={`flex items-center gap-2 ${sale.agent_id ? 'cursor-pointer hover:text-blue-600' : ''}`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${!sale.agent_id ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                          {!sale.agent_id ? <ShieldCheck size={12} /> : <User size={12} />}
                        </div>
                        <span className="font-bold">{sale.profiles?.name || 'Direct'}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-6 font-bold text-slate-900 font-mono text-xs">{sale.recipient_phone}</td>
                  <td className="px-8 py-6 font-black text-slate-900">GH₵ {Number(sale.amount).toFixed(2)}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      sale.status === 'DELIVERED' || sale.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                      sale.status === 'PROCESSING' || sale.status === 'PAID' ? 'bg-blue-50 text-blue-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right text-slate-400 font-bold text-[10px]">{dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper for table icon
const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
