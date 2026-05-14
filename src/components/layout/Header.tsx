'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

import { useAuth } from '@/lib/auth-context';

const Header: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-100 shadow-sm">
        <div className="flex h-16 items-center px-4 max-w-screen-xl mx-auto">
          {/* Menu Toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Branding */}
          <Link href={user ? '/agent' : '/'} className="ml-3 flex items-center group">
            <span className="text-xl font-bold tracking-tight text-blue-600 group-hover:opacity-80 transition-opacity">
              Databundle
            </span>
          </Link>

          {/* Spacer for potential future desktop links */}
          <div className="flex-1" />

          {/* Optional Right Action (e.g. Help icon or Status) */}
          <div className="flex items-center gap-2">
            {/* Can add status indicators here later */}
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </>
  );
};

export default Header;
