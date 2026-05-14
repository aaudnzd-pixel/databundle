import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend }) => {
  return (
    <div className="bg-white p-5 lg:p-7 rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] relative overflow-hidden group hover:shadow-[0_12px_50px_-12px_rgba(0,0,0,0.12)] transition-all duration-500">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-500">
          {icon}
        </div>
        {trend && (
          <div className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${trend.isUp ? 'text-green-600 bg-green-50/80 border border-green-100' : 'text-red-600 bg-red-50/80 border border-red-100'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{label}</p>
        <p className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
        {icon}
      </div>
    </div>
  );
};
