'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PackageList } from '@/components/features/PackageList';
import SupplierService from '@/services/supplier-service';
import { DataPackage } from '@/types/supplier';
import { Loader2, Store, AlertCircle } from 'lucide-react';

export default function AffiliateStorePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [agent, setAgent] = useState<any>(null);
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStore = async () => {
      setIsLoading(true);
      try {
        // 1. Extract the ID suffix from slug (e.g., "samuel-tsrah-a1b2")
        const parts = slug.split('-');
        const idSuffix = parts[parts.length - 1];

        // 2. Find the agent profile
        // Since we only have a suffix, we'll search for profiles where ID ends with this.
        // In a real app, we'd have a 'slug' column.
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*');
        
        if (profileError) throw profileError;

        const matchingAgent = profiles.find(p => p.id.endsWith(idSuffix));

        if (!matchingAgent) {
          setError("Store not found. Please check the link and try again.");
          setIsLoading(false);
          return;
        }

        setAgent(matchingAgent);

        // 3. Store the referring agent ID in localStorage for the purchase flow
        localStorage.setItem('referring_agent_id', matchingAgent.id);

        // 4. Fetch Packages
        const { data: settings } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'global_config')
          .single();
        
        const activeSupplier = settings?.active_supplier || 'HUBTEL';
        const globalCommissionRate = settings?.default_commission_rate ? Number(settings.default_commission_rate) : 0.05;

        const adapter = SupplierService.getAdapter(activeSupplier);
        const rawPackages = await adapter.getPackages();

        // 5. Fetch Agent Markups
        const { data: markupsData } = await supabase
          .from('agent_markups')
          .select('package_id, markup_price')
          .eq('agent_id', matchingAgent.id);
        
        const markupMap: Record<string, number> = {};
        markupsData?.forEach(m => {
          markupMap[m.package_id] = Number(m.markup_price);
        });

        // 6. Apply Pricing Logic
        const marginedPackages = (rawPackages || []).map(pkg => {
          const basePrice = Number(pkg.price) || 0;
          
          // Apply Admin Margin first
          const adminPrice = basePrice + (basePrice * globalCommissionRate);
          
          // Apply Agent Margin
          const agentMarkupPercent = markupMap[pkg.id] ?? Number(matchingAgent.global_markup || 5.0);
          const finalPrice = adminPrice + (adminPrice * (agentMarkupPercent / 100));
          
          return {
            ...pkg,
            price: Number(finalPrice.toFixed(2))
          };
        });

        setPackages(marginedPackages);

      } catch (err: any) {
        console.error('Store Load Error:', err);
        setError("Failed to load store. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadStore();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Opening Store...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Oops! Store Unavailable</h1>
        <p className="text-slate-500 max-w-xs mb-8">{error || "This store link is invalid or has expired."}</p>
        <a 
          href="/"
          className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all"
        >
          Back to Homepage
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Store Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-10 text-center">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
          <Store size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-1">{agent.name}'s Data Store</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Agent Store</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-screen-xl mx-auto w-full">
        <div className="mb-8 text-center">
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Choose a data package below. All bundles are delivered instantly to your phone number.
          </p>
        </div>

        <PackageList initialPackages={packages} />
      </main>

      {/* Footer Branding */}
      <footer className="py-12 text-center text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2">Powered by</p>
        <div className="text-lg font-black text-slate-900 opacity-20">DATABUNDLE GH</div>
      </footer>
    </div>
  );
}
