'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { AgentStats, RecentSales } from '@/components/features/AgentDashboard';
import { PackageList } from '@/components/features/PackageList';
import SupplierService from '@/services/supplier-service';
import { DataPackage } from '@/types/supplier';
import {
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Store,
  Code,
  HelpCircle,
  Settings,
  LogOut,
  Loader2,
  Menu,
  X,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  ShieldAlert,
  Lock,
  Globe,
  Image,
  Bell,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Users,
  Power,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

type TabType = 'OVERVIEW' | 'WALLET' | 'BUY_DATA' | 'MY_STORE' | 'DEVELOPER' | 'HELP' | 'SETTINGS' | 'MANAGEMENT' | 'AGENTS';

export default function AgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    }>
      <AgentPageContent />
    </Suspense>
  );
}

function AgentPageContent() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [walletSubTab, setWalletSubTab] = useState<'SALES' | 'EARNINGS' | 'GLOBAL'>('SALES');
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [fetchingPackages, setFetchingPackages] = useState(false);
  const [globalMarkup, setGlobalMarkup] = useState(5.0);
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [individualMarkups, setIndividualMarkups] = useState<Record<string, number>>({});
  
  // System Management States
  const [systemMaintenance, setSystemMaintenance] = useState(false);
  const [networkMaintenance, setNetworkMaintenance] = useState({
    MTN: false,
    TELECEL: false,
    AIRTEL_TIGO: false,
  });
  const [activeSupplier, setActiveSupplier] = useState('HUBTEL');
  const [dbAgents, setDbAgents] = useState<any[]>([]);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [globalCommissionRate, setGlobalCommissionRate] = useState(0.05);
  const [fetchingData, setFetchingData] = useState(true);
  const [settings, setSettings] = useState({
    twoFactor: false,
    storeName: user?.name ? `${user.name}'s Store` : 'My Store',
    storeSlug: user?.name ? user.name.toLowerCase().replace(/\s+/g, '-') : 'my-store',
    payoutNumber: user?.phone || '0240000000',
    momoName: user?.name || 'Agent Name',
    lowBalanceAlert: 10.0,
    emailNotifications: true,
  });

  // 1. Initial Fetch & Real-time Subscription
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      // Fetch System Settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 'global_config')
        .single();
      
      if (settingsData) {
        setSystemMaintenance(settingsData.maintenance_global);
        setNetworkMaintenance({
          MTN: settingsData.maintenance_mtn,
          TELECEL: settingsData.maintenance_telecel,
          AIRTEL_TIGO: settingsData.maintenance_airtel_tigo,
        });
        setActiveSupplier(settingsData.active_supplier);
        if (settingsData.default_commission_rate) {
          setGlobalCommissionRate(Number(settingsData.default_commission_rate));
        }
      }

      // Fetch Agents
      const { data: agentsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'AGENT')
        .order('created_at', { ascending: false });
      
      if (agentsData) {
        setDbAgents(agentsData);
      }

      // Fetch Individual Markups for current user
      if (user?.id) {
        const { data: markupsData } = await supabase
          .from('agent_markups')
          .select('package_id, markup_price')
          .eq('agent_id', user.id);
        
        if (markupsData) {
          const markupMap: Record<string, number> = {};
          markupsData.forEach(m => {
            markupMap[m.package_id] = Number(m.markup_price);
          });
          setIndividualMarkups(markupMap);
        }

        // Set global markup from user profile if available
        if (user.global_markup !== undefined) {
          setGlobalMarkup(Number(user.global_markup));
        }
      }

      // Fetch User-Specific Transactions (Admins see everything, Agents see their own)
      const txQuery = supabase
        .from('transactions')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (user.role !== 'ADMIN') {
        txQuery.eq('agent_id', user.id);
      }

      const { data: txData } = await txQuery;
      
      if (txData) {
        setDbTransactions(txData);
      }

      setFetchingData(false);
    };

    fetchData();

    // Subscribe to System Settings
    const settingsChannel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'system_settings',
        filter: 'id=eq.global_config'
      }, (payload) => {
        const newData = payload.new;
        setSystemMaintenance(newData.maintenance_global);
        setNetworkMaintenance({
          MTN: newData.maintenance_mtn,
          TELECEL: newData.maintenance_telecel,
          AIRTEL_TIGO: newData.maintenance_airtel_tigo,
        });
        setActiveSupplier(newData.active_supplier);
        if (newData.default_commission_rate) {
          setGlobalCommissionRate(Number(newData.default_commission_rate));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const handleSaveMarkups = async () => {
    if (!user) return;
    
    setFetchingData(true);
    try {
      // 1. Update Global Markup in Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ global_markup: globalMarkup })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Prepare Individual Markup Data
      const markupEntries = Object.entries(individualMarkups).map(([packageId, markup]) => ({
        agent_id: user.id,
        package_id: packageId,
        markup_price: markup
      }));

      // 3. Clear existing markups and insert new ones
      await supabase.from('agent_markups').delete().eq('agent_id', user.id);
      
      if (markupEntries.length > 0) {
        const { error: markupError } = await supabase
          .from('agent_markups')
          .insert(markupEntries);
        if (markupError) throw markupError;
      }

      alert('Store pricing synchronized to database successfully! 🚀');
    } catch (err: any) {
      console.error('Error saving markups:', err.message);
      alert('Failed to save markups: ' + err.message);
    } finally {
      setFetchingData(false);
    }
  };

  const handleGlobalToggle = async () => {
    const newState = !systemMaintenance;
    
    // Optimistic Update
    setSystemMaintenance(newState);
    
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        maintenance_global: newState,
        maintenance_mtn: newState,
        maintenance_telecel: newState,
        maintenance_airtel_tigo: newState
      })
      .eq('id', 'global_config');

    if (error) {
      console.error('Error updating global maintenance:', error.message);
      // Rollback on error if needed, but subscription will fix it eventually
    }
  };

  const handleNetworkToggle = async (id: string) => {
    const isNowDown = !networkMaintenance[id as keyof typeof networkMaintenance];
    const newNetworkState = { 
      ...networkMaintenance, 
      [id]: isNowDown 
    };
    
    // Auto-calculate master state
    const allDown = Object.values(newNetworkState).every(v => v);
    const newGlobalState = allDown;

    // Optimistic Update
    setNetworkMaintenance(newNetworkState);
    setSystemMaintenance(newGlobalState);

    const dbField = id === 'MTN' ? 'maintenance_mtn' : 
                    id === 'TELECEL' ? 'maintenance_telecel' : 
                    'maintenance_airtel_tigo';

    const { error } = await supabase
      .from('system_settings')
      .update({ 
        [dbField]: isNowDown,
        maintenance_global: newGlobalState
      })
      .eq('id', 'global_config');

    if (error) {
      console.error('Error updating network maintenance:', error.message);
    }
  };

  // Auto-scroll to expanded agent
  useEffect(() => {
    if (expandedAgentId && activeTab === 'AGENTS') {
      const timer = setTimeout(() => {
        const element = document.getElementById(`agent-row-${expandedAgentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedAgentId, activeTab]);

  const navigateToAgent = (agentId: string) => {
    setActiveTab('AGENTS');
    setExpandedAgentId(agentId);
  };

  useEffect(() => {
    const fetchPackages = async () => {
      setFetchingPackages(true);
      try {
        const adapter = SupplierService.getAdapter();
        const data = await adapter.getPackages();
        setPackages(data);
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setFetchingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab')?.toUpperCase() as TabType;
    if (tab && ['OVERVIEW', 'WALLET', 'BUY_DATA', 'MY_STORE', 'DEVELOPER', 'HELP', 'SETTINGS', 'MANAGEMENT', 'AGENTS'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !user) {
      // Let the auth-context handle redirection if needed, or just allow the component to unmount
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    { id: 'WALLET', label: 'Wallet', icon: Wallet },
    { id: 'BUY_DATA', label: 'Buy Data', icon: ShoppingCart },
    { id: 'MY_STORE', label: 'My Store', icon: Store },
    { id: 'DEVELOPER', label: 'Developer Portal', icon: Code },
    { id: 'HELP', label: 'Help & Support', icon: HelpCircle },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ];

  if (user.role === 'ADMIN') {
    tabs.splice(1, 0, { id: 'AGENTS', label: 'Manage Agents', icon: Users });
    tabs.push({ id: 'MANAGEMENT', label: 'System Management', icon: ShieldCheck });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <AgentStats stats={{
              totalSales: dbTransactions.filter(tx => tx.status === 'DELIVERED').reduce((acc, tx) => acc + Number(tx.amount), 0),
              totalCommissions: dbTransactions.filter(tx => tx.status === 'DELIVERED').reduce((acc, tx) => acc + Number(tx.commission_earned), 0),
              balance: user.balance || 0
            }} />
            <RecentSales 
              sales={dbTransactions} 
              isLoading={fetchingData}
              onViewAll={() => {
                setActiveTab('WALLET');
                setWalletSubTab('SALES');
              }} 
              onAgentClick={navigateToAgent}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
              {/* Left Column: Main Content */}
              <div className="lg:col-span-2 space-y-8">
                <RecentSales 
                  onViewAll={() => {
                    setActiveTab('WALLET');
                    setWalletSubTab('SALES');
                  }} 
                  onAgentClick={navigateToAgent}
                />
              </div>

              {/* Right Column: Quick Info/Actions */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setActiveTab('BUY_DATA')}
                      className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <ShoppingCart size={16} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-blue-900">Buy Data</span>
                      </div>
                      <ArrowRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => setActiveTab('MY_STORE')}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Store size={16} className="text-slate-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">My Store Link</span>
                      </div>
                      <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Helpful Tip Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <HelpCircle size={14} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">Pro Tip</span>
                  </div>
                  <h4 className="text-sm font-bold mb-2">Maximize Commissions</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sharing your store link on WhatsApp Status generates 3x more sales than social media posts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'BUY_DATA':
        return (
          <div className="animate-in fade-in duration-500">
            {fetchingPackages ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching latest packages...</p>
              </div>
            ) : (
              <PackageList initialPackages={packages} isDashboard={true} />
            )}
          </div>
        );
      case 'MY_STORE':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Store Link Section */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Store size={20} className="text-blue-600" />
                Store Links
              </h3>
              <p className="text-sm text-slate-500 mb-6">Share your personalized store links with customers to earn commissions.</p>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Store Link</span>
                  <div className="flex items-center justify-between mt-1 gap-4">
                    <code className="text-sm font-bold text-blue-600 truncate">https://databundle.gh/s/{user.name.toLowerCase().replace(/\s+/g, '-')}-{user.id.slice(-4)}</code>
                    <button
                      onClick={() => {
                        const url = `https://databundle.gh/s/${user.name.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(-4)}`;
                        navigator.clipboard.writeText(url);
                        alert('Link copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Pricing Adjustment */}
            <div className={`bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all duration-500 ${Object.keys(individualMarkups).length > 0 ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Unified Profit Margin
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {Object.keys(individualMarkups).length > 0
                      ? 'Adjusting this will override all individual package markups.'
                      : 'Set a default profit margin for all packages in your store.'}
                  </p>
                </div>
                <div className="text-3xl font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl">
                  {globalMarkup.toFixed(1)}%
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={globalMarkup}
                  onChange={(e) => {
                    setGlobalMarkup(parseFloat(e.target.value));
                    setIndividualMarkups({}); 
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(globalMarkup / 20) * 100}%, #e2e8f0 ${(globalMarkup / 20) * 100}%, #e2e8f0 100%)`
                  }}
                />
                <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>0% (No Profit)</span>
                  <span>10% (Standard)</span>
                  <span>20% (High Profit)</span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleSaveMarkups}
                  disabled={fetchingData}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchingData ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  Save Store Pricing
                </button>
              </div>
            </div>

            {/* Unified Store Filter */}
            <div className="sticky top-[148px] z-20 bg-white/95 backdrop-blur-md -mx-8 px-8 py-4 mb-8 flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-100 transition-all duration-300">
              {['ALL', 'MTN', 'TELECEL', 'AIRTEL_TIGO'].map((net) => (
                <button
                  key={net}
                  onClick={() => setStoreFilter(net)}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    storeFilter === net 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105' 
                      : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200 hover:text-slate-600'
                  }`}
                >
                  {net.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {packages
                .filter(p => storeFilter === 'ALL' || p.supplier === storeFilter)
                .map((pkg) => {
                  const markup = individualMarkups[pkg.id] ?? globalMarkup;
                  const profitAmount = (pkg.price * markup) / 100;
                  const finalPrice = pkg.price + profitAmount;
                  const isOverridden = individualMarkups[pkg.id] !== undefined;

                  return (
                    <div key={pkg.id} className={`bg-white p-5 rounded-[2.5rem] border transition-all group shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 duration-300 flex flex-col justify-between ${isOverridden ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-300 hover:border-blue-400'}`}>
                      <div className="text-left mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{pkg.supplier}</span>
                          {isOverridden && <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-lg uppercase">Manual</span>}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight">{pkg.dataAmount}</h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{pkg.name}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Markup</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={markup}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setIndividualMarkups(prev => ({ ...prev, [pkg.id]: val }));
                              }}
                              className={`w-12 p-1 text-right font-black border rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isOverridden ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}
                            />
                            <span className="text-[10px] font-black text-slate-900">%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 p-2 rounded-xl text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block">Profit</span>
                            <span className="text-[11px] font-black text-green-600">+₵{profitAmount.toFixed(1)}</span>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-xl text-center">
                            <span className="text-[8px] font-black text-blue-400 uppercase block">Sell At</span>
                            <span className="text-[11px] font-black text-blue-600">₵{finalPrice.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      case 'WALLET':
        return (
          <div className="max-w-screen-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Column: Sales/Earnings History */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm w-fit">
                  <button 
                    onClick={() => setWalletSubTab('SALES')}
                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${walletSubTab === 'SALES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Personal Sales
                  </button>
                  <button 
                    onClick={() => setWalletSubTab('EARNINGS')}
                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${walletSubTab === 'EARNINGS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    Earnings
                  </button>
                  {user.role === 'ADMIN' && (
                    <button 
                      onClick={() => setWalletSubTab('GLOBAL')}
                      className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${walletSubTab === 'GLOBAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Global History
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {walletSubTab === 'SALES' ? 'Your Sales' : walletSubTab === 'EARNINGS' ? 'Your Earnings' : 'Platform Global History'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {walletSubTab === 'GLOBAL' ? 'All agent and system transactions across the platform.' : 'Your personal activity and earnings.'}
                      </p>
                    </div>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Package & Date</th>
                          {(walletSubTab === 'GLOBAL' || walletSubTab === 'SALES') && <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source / Type</th>}
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient & Payment</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount & Earnings</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(walletSubTab === 'GLOBAL' 
                          ? dbTransactions 
                          : dbTransactions.filter(tx => tx.agent_id === user.id)
                        ).map((item: any) => {
                          const isExpanded = expandedTxId === item.id;
                          const sourceLabel = item.agent_id ? (item.type === 'LINK' ? 'Agent Link' : 'Agent Direct') : 'Direct Platform';
                          const amount = Number(item.amount);
                          const dateObj = new Date(item.created_at);
                          const dateDisplay = dateObj.toLocaleDateString() === new Date().toLocaleDateString() 
                            ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : dateObj.toLocaleDateString();

                          return (
                            <React.Fragment key={item.id}>
                              <tr 
                                onClick={() => setExpandedTxId(isExpanded ? null : item.id)}
                                className={`text-sm group cursor-pointer transition-all ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                              >
                                <td className="px-8 py-6">
                                  <div className="font-bold text-slate-900">{item.package_name || 'Data Bundle'}</div>
                                  <div className="text-[10px] text-slate-400 font-bold">{dateDisplay}</div>
                                </td>
                                {(walletSubTab === 'GLOBAL' || walletSubTab === 'SALES') && (
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black w-fit uppercase tracking-widest ${
                                        item.type === 'LINK' ? 'bg-blue-50 text-blue-600' : 
                                        item.type === 'DIRECT' ? 'bg-purple-50 text-purple-600' : 
                                        'bg-orange-50 text-orange-600'
                                      }`}>
                                        {sourceLabel}
                                      </span>
                                      {walletSubTab === 'GLOBAL' && item.profiles && (
                                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                          <User size={10} />
                                          {item.profiles.name}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-8 py-6">
                                  <div className="font-bold text-slate-900 font-mono text-xs">{item.recipient_phone}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase">{item.payment_method || 'MOMO'}</div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="font-black text-slate-900">GH₵ {amount.toFixed(2)}</div>
                                  {walletSubTab === 'EARNINGS' && (
                                    <div className="text-[10px] font-bold text-green-600">+GH₵ {Number(item.commission_earned || 0).toFixed(2)}</div>
                                  )}
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                      item.status === 'DELIVERED' ? 'bg-green-50 text-green-600' : 
                                      item.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600' : 
                                      'bg-red-50 text-red-600'
                                    }`}>
                                      {item.status}
                                    </span>
                                    <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="px-8 py-8 bg-slate-50/50 border-b border-slate-100">
                                    <OrderProgressTracker status={item.status} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar Column: Financial Summary */}
              <div className="space-y-6">
                <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-blue-600/30 relative overflow-hidden flex flex-col justify-center">
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-2">Current Balance</span>
                    <div className="text-3xl font-black mb-4">GH₵ {user?.balance?.toLocaleString() || '0.00'}</div>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => alert('Withdrawal request initiated. Processing to your MoMo number...')}
                        className="w-full py-3 bg-white text-blue-600 font-black rounded-2xl text-xs shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                      >
                        Withdraw Commissions
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Financial Stats</h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-bold">Today's Earnings</span>
                        <span className="text-sm font-black text-green-600">+GH₵ 42.00</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[65%] h-full bg-green-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-bold">Monthly Sales</span>
                        <span className="text-sm font-black text-slate-900">GH₵ 8,420.00</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-blue-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'DEVELOPER':
        return (
          <div className="max-w-screen-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Column: API Keys & Webhooks */}
              <div className="lg:col-span-2 space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Code size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">API Configuration</h3>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] p-8 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900">Secret API Key</h4>
                          <p className="text-xs text-slate-500">Use this to authenticate your server-side requests.</p>
                        </div>
                        <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">Regenerate</button>
                      </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <code className="text-blue-400 text-sm font-mono truncate">sk_live_db_51N8W4sH...9x2</code>
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                          <Globe size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-900">Webhook URL</h4>
                        <p className="text-xs text-slate-500">We'll send POST requests here when transactions are updated.</p>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="https://your-domain.com/api/webhooks"
                          className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button className="px-8 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-slate-800 transition-all">Save</button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <HelpCircle size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Documentation Quick Start</h3>
                  </div>
                  <div className="bg-slate-950 rounded-[2.5rem] p-8 text-slate-400 font-mono text-xs space-y-4 overflow-hidden relative">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    </div>
                    <p className="text-blue-400"># Fetch all available data packages</p>
                    <p><span className="text-pink-400">curl</span> -X GET https://api.databundle.gh/v1/packages \</p>
                    <p>  -H <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span></p>
                    
                    <p className="text-blue-400 mt-6"># Buy a data bundle</p>
                    <p><span className="text-pink-400">curl</span> -X POST https://api.databundle.gh/v1/purchase \</p>
                    <p>  -H <span className="text-green-400">"Content-Type: application/json"</span> \</p>
                    <p>  -d <span className="text-orange-400">{`{ "package_id": "mtn-5gb", "recipient": "0240000000" }`}</span></p>
                  </div>
                </section>
              </div>

              {/* Right Column: API Status & Stats */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Environment Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                      <span className="text-xs font-bold text-green-700 uppercase tracking-tighter">Production API</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-green-600">ONLINE</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-tighter">Sandbox API</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-black text-blue-600">STABLE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Monthly Usage</h4>
                  <div className="text-3xl font-black text-slate-900 mb-1">12,402</div>
                  <p className="text-[10px] text-slate-500 font-bold mb-6">Successful API calls this month</p>
                  <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-slate-800 transition-all">
                    Contact Developer Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'HELP':
        return (
          <div className="max-w-screen-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Column: FAQ Accordion */}
              <div className="lg:col-span-2 space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <HelpCircle size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Frequently Asked Questions</h3>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                    {[
                      { q: "How long does data delivery take?", a: "Most bundles are delivered within 5-30 seconds after payment confirmation. If it takes longer than 5 minutes, please contact support with your Order ID." },
                      { q: "How are my commissions calculated?", a: "Commissions depend on the network and package. You earn a profit margin on every sale made through your store link or manual purchase." },
                      { q: "When can I withdraw my earnings?", a: "You can withdraw your commissions at any time once you reach a minimum balance of GH₵ 5.00. Withdrawals to your MoMo are instant." },
                      { q: "What happens if a transaction fails?", a: "If a transaction fails, your wallet balance will be automatically refunded within 2 minutes. For MoMo payments, refunds are processed within 24 hours." },
                    ].map((faq, idx) => (
                      <div key={idx} className="border-b border-slate-50 last:border-0">
                        <div className="p-6 hover:bg-slate-50 transition-all cursor-pointer group">
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                            {faq.q}
                            <ChevronDown size={18} className="text-slate-300 group-hover:text-blue-400" />
                          </h4>
                          <p className="text-sm text-slate-500 mt-4 leading-relaxed bg-slate-50/50 p-4 rounded-2xl">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column: Contact Support */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-300 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Direct Support</h4>
                  <div className="space-y-3">
                    <button className="w-full p-4 bg-green-50 text-green-700 rounded-2xl flex items-center justify-between group hover:bg-green-100 transition-all border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                          <Bell size={18} className="text-green-600" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black block uppercase tracking-widest">WhatsApp</span>
                          <span className="text-[10px] font-bold text-green-600">Average reply: 2 mins</span>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-green-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full p-4 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-between group hover:bg-blue-100 transition-all border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                          <Bell size={18} className="text-blue-600" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black block uppercase tracking-widest">Live Chat</span>
                          <span className="text-[10px] font-bold text-blue-600">Available 8am - 10pm</span>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h4 className="text-lg font-black mb-2">Need help with your business?</h4>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                      Schedule a call with our Agent Success team to optimize your store and earnings.
                    </p>
                    <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all">
                      Book a Success Call
                    </button>
                  </div>
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'AGENTS':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Agent Network</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Live performance management</p>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search agents..." 
                      className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                    />
                    <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-10 py-5">Agent</th>
                      <th className="px-10 py-5">Summary</th>
                      <th className="px-10 py-5">Status</th>
                      <th className="px-10 py-5 text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dbAgents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-10 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                              <Users size={32} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">No agents found</p>
                              <p className="text-xs text-slate-400 font-medium">Real agents will appear here after they sign up.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : dbAgents.map((agent: any) => {
                      const isExpanded = expandedAgentId === agent.id;
                      const initials = agent.name ? agent.name[0] : 'A';
                      const shortId = agent.id.split('-')[0].toUpperCase();

                      return (
                        <React.Fragment key={agent.id}>
                          <tr 
                            onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                            className={`group cursor-pointer transition-all ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                          >
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${isExpanded ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-black text-slate-900">{agent.name}</div>
                                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{shortId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900">GH₵ {(agent.balance + agent.commissions).toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Value Profile</span>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                (agent.status || 'ACTIVE') === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                              }`}>
                                {agent.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="px-10 py-8 text-right">
                              <div className="flex items-center justify-end gap-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest">{isExpanded ? 'Close' : 'View History'}</span>
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </div>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="p-0 border-b border-slate-100 bg-slate-50/30">
                                <div className="p-10 space-y-8 animate-in slide-in-from-top-4 duration-500">
                                  {/* Stats Grid */}
                                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                    <div className="bg-blue-600 py-6 px-8 rounded-[2.5rem] shadow-xl shadow-blue-600/20 text-white relative overflow-hidden group col-span-2 lg:col-span-1 border border-white/10 flex items-center justify-between">
                                      <div className="relative z-10">
                                        <span className="text-[10px] font-black opacity-60 uppercase tracking-widest block mb-1">Available Balance</span>
                                        <span className="text-2xl font-black leading-none block">GH₵ {agent.balance.toFixed(2)}</span>
                                      </div>
                                      <Wallet size={32} className="opacity-10 group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="bg-white py-6 px-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Sales</span>
                                      <span className="text-xl font-black text-slate-900 block truncate">GH₵ {
                                        dbTransactions
                                          .filter(tx => tx.agent_id === agent.id && tx.status === 'DELIVERED')
                                          .reduce((acc, tx) => acc + Number(tx.amount), 0)
                                          .toFixed(2)
                                      }</span>
                                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-green-600">
                                        <TrendingUp size={12} />
                                        <span>Real Data</span>
                                      </div>
                                    </div>
                                    <div className="bg-white py-6 px-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Earned</span>
                                      <span className="text-xl font-black text-slate-900 block truncate">GH₵ {
                                        dbTransactions
                                          .filter(tx => tx.agent_id === agent.id && tx.status === 'DELIVERED')
                                          .reduce((acc, tx) => acc + Number(tx.commission_earned || 0), 0)
                                          .toFixed(2)
                                      }</span>
                                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                        <TrendingUp size={12} />
                                        <span>Lifetime</span>
                                      </div>
                                    </div>
                                    <div className="bg-white py-6 px-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Commissions</span>
                                      <span className="text-xl font-black text-blue-600 block truncate">GH₵ {agent.commissions.toFixed(2)}</span>
                                      <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase truncate tracking-tighter">Lifetime Earnings</div>
                                    </div>
                                  </div>

                                  {/* History Table */}
                                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Combined History Log</h4>
                                      <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View Full Logs</button>
                                    </div>
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                          <th className="px-8 py-4">Transaction</th>
                                          <th className="px-8 py-4">Numbers (Rec / Pay)</th>
                                          <th className="px-8 py-4">Amount</th>
                                          <th className="px-8 py-4 text-right">Time</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {[
                                          { type: 'SALE', source: 'Link', pkg: 'MTN 10GB', amount: 75, date: '14:20', rec: '0245678123', pay: '0559900112' },
                                          { type: 'COMMISSION', source: 'Earning', pkg: 'MTN 10GB', amount: 3.75, date: '14:20', rec: '-', pay: '-' },
                                          { type: 'SALE', source: 'Direct', pkg: 'Telecel 5GB', amount: 35, date: '12:05', rec: '0201122334', pay: '0201122334' },
                                          { type: 'WITHDRAWAL', source: 'MoMo', pkg: 'Payout Request', amount: -200, date: 'Yesterday', rec: '0244112233', pay: 'Wallet' },
                                        ].map((tx, idx) => (
                                          <tr key={idx} className="text-[12px] group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                              <div className="flex items-center gap-2">
                                                <div className={`p-1 rounded-lg ${
                                                  tx.type === 'SALE' ? 'bg-blue-50 text-blue-600' :
                                                  tx.type === 'COMMISSION' ? 'bg-green-50 text-green-600' :
                                                  'bg-orange-50 text-orange-600'
                                                }`}>
                                                  {tx.type === 'SALE' ? <ShoppingCart size={12} /> : tx.type === 'COMMISSION' ? <TrendingUp size={12} /> : <Wallet size={12} />}
                                                </div>
                                                <div>
                                                  <div className="font-bold text-slate-900">{tx.pkg}</div>
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase">{tx.source}</div>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-8 py-4">
                                              <div className="flex flex-col">
                                                <span className="text-slate-600 font-mono">Rec: {tx.rec}</span>
                                                <span className="text-slate-400 font-mono">Pay: {tx.pay}</span>
                                              </div>
                                            </td>
                                            <td className="px-8 py-4">
                                              <span className={`font-black ${tx.amount > 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? `GH₵ ${tx.amount.toFixed(2)}` : `-GH₵ ${Math.abs(tx.amount).toFixed(2)}`}
                                              </span>
                                            </td>
                                            <td className="px-8 py-4 text-right text-slate-400 font-bold">{tx.date}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'MANAGEMENT':
        return (
          <div className="max-w-screen-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Column: System Controls */}
              <div className="lg:col-span-2 space-y-8">
                {/* 1. Global Platform Switch */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <ShieldCheck size={18} className="text-red-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Master Platform Controls</h3>
                  </div>
                  {(() => {
                    const downNetworks = Object.entries(networkMaintenance)
                      .filter(([_, isDown]) => isDown)
                      .map(([id]) => id);
                    const isAllDown = downNetworks.length === 3;
                    const isAnyDown = downNetworks.length > 0;
                    const effectiveMaintenance = systemMaintenance || isAllDown;
                    const isPartial = !effectiveMaintenance && isAnyDown;

                    return (
                      <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${
                        effectiveMaintenance ? 'bg-red-50 border-red-200' : 
                        isPartial ? 'bg-orange-50 border-orange-200' : 
                        'bg-white border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                            <div className={`p-4 rounded-2xl transition-colors flex-shrink-0 ${
                              effectiveMaintenance ? 'bg-red-600 text-white' : 
                              isPartial ? 'bg-orange-500 text-white' : 
                              'bg-slate-100 text-slate-400'
                            }`}>
                              <Power size={24} />
                            </div>
                            <div className="min-w-0">
                              <h4 className={`text-base md:text-lg font-black truncate ${
                                effectiveMaintenance ? 'text-red-900' : 
                                isPartial ? 'text-orange-900' : 
                                'text-slate-900'
                              }`}>
                                {effectiveMaintenance ? 'Platform Under Maintenance' : 
                                 isPartial ? 'System Partially Operational' : 
                                 'Platform Fully Operational'}
                              </h4>
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2">
                                  {effectiveMaintenance 
                                    ? 'All orders are currently blocked. Agents will see a maintenance message.' 
                                    : isPartial 
                                      ? 'System is active but specific networks are currently offline.'
                                      : 'System is live. All data purchases and wallet operations are enabled.'}
                                </p>
                                {isPartial && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {downNetworks.map(net => (
                                      <span key={net} className="px-2 py-0.5 bg-orange-200 text-orange-900 rounded-full text-[9px] font-black uppercase tracking-widest">
                                        {net} Down
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleGlobalToggle}
                            className={`w-14 h-7 md:w-16 md:h-8 rounded-full transition-all relative flex-shrink-0 ${systemMaintenance ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-0.5 md:top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${systemMaintenance ? 'left-7.5 md:left-9' : 'left-0.5 md:left-1'}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* 2. Granular Network Toggles */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Globe size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Network Outage Management</h3>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-50">
                      {[
                        { id: 'MTN', label: 'MTN Data Services', color: 'bg-yellow-400' },
                        { id: 'TELECEL', label: 'Telecel (Vodafone)', color: 'bg-red-600' },
                        { id: 'AIRTEL_TIGO', label: 'AirtelTigo / AT', color: 'bg-blue-600' }
                      ].map((net) => (
                        <div key={net.id} className="p-6 flex items-center justify-between gap-4 group hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${net.color}`} />
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{net.label}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Network Status Control</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${networkMaintenance[net.id as keyof typeof networkMaintenance] ? 'text-red-600' : 'text-green-600'}`}>
                              {networkMaintenance[net.id as keyof typeof networkMaintenance] ? 'Maintenance' : 'Operational'}
                            </span>
                            <button
                              onClick={() => handleNetworkToggle(net.id)}
                              className={`w-11 h-5.5 md:w-12 md:h-6 rounded-full transition-all relative flex-shrink-0 ${networkMaintenance[net.id as keyof typeof networkMaintenance] ? 'bg-red-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-0.5 md:top-1 w-4 h-4 bg-white rounded-full transition-all ${networkMaintenance[net.id as keyof typeof networkMaintenance] ? 'left-6 md:left-7' : 'left-0.5 md:left-1'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar Column: Provider & Safety */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Code size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Supplier API Engine</h3>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-sm space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Data Supplier</label>
                      <div className="relative">
                        <select 
                          value={activeSupplier}
                          onChange={(e) => setActiveSupplier(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="BUNDLECORNER">BundleCorner API (Real)</option>
                          <option value="HUBTEL">Hubtel API (Default)</option>
                          <option value="PAYSTACK">Paystack Dedicated</option>
                          <option value="NALO">Nalo Solutions</option>
                          <option value="MOCK">Development Sandbox</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-4.5 text-slate-400 pointer-events-none" size={20} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Commission Rate</label>
                      <div className="relative">
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="0.20"
                            step="0.01"
                            value={globalCommissionRate}
                            onChange={async (e) => {
                              const val = parseFloat(e.target.value);
                              setGlobalCommissionRate(val);
                              await supabase.from('system_settings').update({ default_commission_rate: val }).eq('id', 'global_config');
                            }}
                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{(globalCommissionRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                      <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        <strong>Safety Note:</strong> Switching suppliers is instant and non-destructive. The platform will automatically route all new orders through the selected adapter.
                      </p>
                    </div>

                    <button 
                      onClick={() => alert('Supplier API updated successfully. Orders will now route through ' + activeSupplier)}
                      className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={14} />
                      Update Provider
                    </button>
                  </div>
                </section>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="text-lg font-black mb-2">Automated Fallback</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      If the primary supplier returns a 5xx error, the system will automatically attempt a retry on the secondary sandbox for 60 seconds before flagging a network outage.
                    </p>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'SETTINGS':
        return (
          <div className="max-w-screen-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-8">
                {/* 1. Account & Security */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <User size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Account & Security</h3>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="p-6 border-b border-slate-50 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="p-6 space-y-6 bg-slate-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Lock size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">Two-Factor Auth</h4>
                            <p className="text-xs text-slate-500">Secure your wallet funds.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, twoFactor: !prev.twoFactor }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.twoFactor ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twoFactor ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Business & Store Settings */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Store size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Business & Store</h3>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
                        <input
                          type="text"
                          defaultValue={settings.storeName}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store URL Slug</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold">/s/</span>
                          <input
                            type="text"
                            defaultValue={settings.storeSlug}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar: Financial Settings */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <CreditCard size={18} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Payout Account</h3>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-300 shadow-sm space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Connected MoMo</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 leading-none">
                          {(!settings.payoutNumber || settings.payoutNumber === '0240000000') ? 'No Account Connected' : settings.payoutNumber}
                        </span>
                        {(!settings.payoutNumber || settings.payoutNumber === '0240000000') ? null : (
                          <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase">Primary</span>
                        )}
                      </div>
                      <div className="text-[10px] text-blue-400 font-medium">
                        {(!settings.payoutNumber || settings.payoutNumber === '0240000000') ? 'Click below to connect' : settings.momoName}
                      </div>
                    </div>
                    <button className="w-full py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl text-xs hover:bg-slate-50 transition-all">
                      {(!settings.payoutNumber || settings.payoutNumber === '0240000000') ? 'Connect MoMo Account' : 'Change Payout Method'}
                    </button>
                  </div>
                </section>

                <button 
                  onClick={() => alert('All settings saved successfully!')}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <ShieldCheck size={20} />
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center animate-in fade-in duration-500">
            <h2 className="text-xl font-bold text-slate-900">Section Under Construction</h2>
            <p className="text-slate-500 mt-2">We are working on this feature.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="p-6 md:p-10">
        <div className="max-w-screen-xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              {user.role === 'ADMIN' ? 'Administrator Access' : 'Agent Portal Active'}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Welcome, {user.name.split(' ')[0]}!
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === 'OVERVIEW' ? 'Here is a summary of the system performance today.' : `Manage ${activeTab.toLowerCase()} settings and system parameters.`}
                </p>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-50 transition-all text-sm"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>

          {/* Dashboard Navigation Bar */}
          <div className="sticky top-16 z-20 bg-slate-50/95 backdrop-blur-sm -mx-4 px-4 py-4 mb-8 flex items-center gap-2 overflow-x-auto scrollbar-hide border-b border-slate-300">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-white text-slate-500 border border-slate-300 hover:border-blue-200 hover:text-blue-600'}
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
}
const OrderProgressTracker = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Order Initiated', date: '10:45 AM', sub: 'Request received from Agent' },
    { label: 'Payment Confirmed', date: '10:46 AM', sub: 'Wallet/MoMo verified' },
    { label: 'Processing with Provider', date: '10:47 AM', sub: 'Sending to Network Operator' },
    { label: status === 'FAILED' ? 'Delivery Failed' : 'Order Delivered', date: '10:50 AM', sub: status === 'FAILED' ? 'Provider returned error (Insufficient credit)' : 'Confirmed by Network Operator' },
  ];

  const currentStep = 
    status === 'INITIATED' ? 1 :
    status === 'PROCESSING' ? 2 :
    status === 'DELIVERED' || status === 'FAILED' ? 3 : 0;

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="flex items-center justify-between mb-8">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Order Progress Tracker</h4>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'DELIVERED' ? 'bg-green-500' : status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
          <span className="text-[10px] font-black uppercase text-slate-500">{status}</span>
        </div>
      </div>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />
        <div 
          className={`absolute left-[11px] top-2 w-0.5 bg-blue-600 transition-all duration-1000`} 
          style={{ height: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        <div className="space-y-6">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;
            const isLast = idx === steps.length - 1;
            const isFailed = isLast && status === 'FAILED';

            return (
              <div key={idx} className="flex items-start gap-6 relative group">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                  isFailed ? 'bg-red-600 border-red-100' :
                  isCompleted ? 'bg-blue-600 border-blue-100' : 
                  'bg-white border-slate-100'
                }`}>
                  {isCompleted && !isFailed && <CheckCircle size={10} className="text-white" />}
                  {isFailed && <X size={10} className="text-white" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-widest ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{step.date}</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">{step.sub}</p>
                  
                  {isCurrent && status === 'PROCESSING' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">Awaiting provider confirmation...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
