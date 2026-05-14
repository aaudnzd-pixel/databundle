'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'AGENT' | 'ADMIN';
  balance: number;
  commissions: number;
  global_markup: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Initial Session Check
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser(profile as User);
        }
      }
      setIsLoading(false);
    };

    checkUser();

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth Event:', event, session?.user?.email);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser(profile as User);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login error:', error.message);
      setIsLoading(false);
      return false;
    }

    setIsLoading(false);
    return true;
  };

  const signup = async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });

    if (authError || !authData.user) {
      console.error('Signup error:', authError?.message);
      setIsLoading(false);
      return false;
    }

    // 2. Insert into Profiles table
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      email,
      phone,
      role: 'AGENT',
      balance: 0.00,
      commissions: 0.00
    });

    // 3. Graceful Synchronization Wait
    // Sometimes Supabase takes a split second to propagate the new user session
    // We wait until we can actually fetch the profile back before proceeding
    let retries = 5;
    let profileVerified = false;
    
    while (retries > 0 && !profileVerified) {
      const { data: check } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single();
      if (check) {
        profileVerified = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        retries--;
      }
    }

    setIsLoading(false);
    return profileVerified;
  };

  const logout = async () => {
    console.log('🚀 Logging out...');
    setUser(null);
    localStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
