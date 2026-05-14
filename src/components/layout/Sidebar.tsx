'use client';

import React from 'react';
import Link from 'next/link';
import { 
  X, 
  Home, 
  Search, 
  Users, 
  HelpCircle, 
  LayoutDashboard, 
  Wallet, 
  ShoppingCart, 
  Store,
  Settings,
  LogOut,
  TrendingUp,
  Code,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const publicLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/track', label: 'Track Order', icon: Search },
    { href: '/login', label: 'Become an Agent', icon: Users },
    { href: '/help', label: 'Help', icon: HelpCircle },
  ];

  // Dynamic links based on role
  const getAgentLinks = () => {
    const baseLinks = [
      { href: '/agent?tab=overview', id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
      { href: '/agent?tab=wallet', id: 'WALLET', label: 'Wallet', icon: Wallet },
      { href: '/agent?tab=buy_data', id: 'BUY_DATA', label: 'Buy Data', icon: ShoppingCart },
      { href: '/agent?tab=my_store', id: 'MY_STORE', label: 'My Store', icon: Store },
      { href: '/agent?tab=developer', id: 'DEVELOPER', label: 'Developer Portal', icon: Code },
      { href: '/agent?tab=help', id: 'HELP', label: 'Help & Support', icon: HelpCircle },
      { href: '/agent?tab=settings', id: 'SETTINGS', label: 'Settings', icon: Settings },
    ];

    if (user?.role === 'ADMIN') {
      baseLinks.splice(1, 0, { href: '/agent?tab=agents', id: 'AGENTS', label: 'Manage Agents', icon: Users });
      baseLinks.push({ href: '/agent?tab=management', id: 'MANAGEMENT', label: 'System Management', icon: ShieldCheck });
    }

    return baseLinks;
  };

  const agentLinks = user ? getAgentLinks() : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <Link href={user ? '/agent' : '/'} onClick={onClose} className="text-xl font-bold text-blue-600">
              Databundle
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* User Profile (if logged in) */}
          {user && (
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/30">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate">{user.name}</h3>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    {user.role === 'ADMIN' ? 'Administrator' : 'Agent Account'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {(user ? agentLinks : publicLinks).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-4 px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group"
                >
                  <Icon size={22} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="p-6 border-t border-slate-100">
            {user ? (
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium group"
              >
                <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
                Logout
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center">
                &copy; 2024 Databundle Ghana
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
