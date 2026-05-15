'use client';

import { useEffect, useState } from 'react';
import config from '@/config';
import { useAuth } from '@/lib/auth-context';

interface PaystackProps {
  email: string;
  amount: number;
  metadata?: any;
  onSuccess: (reference: any) => void;
  onClose: () => void;
}

export function usePaystack() {
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializePayment = ({ amount, metadata, onSuccess, onClose }: Omit<PaystackProps, 'email'>) => {
    if (!loaded || !(window as any).PaystackPop) {
      console.error('Paystack script not loaded');
      return;
    }

    if (!config.paystack.publicKey || !config.paystack.publicKey.startsWith('pk_')) {
      console.error('Invalid Paystack Public Key:', config.paystack.publicKey);
      alert('Payment system configuration error. Please contact support.');
      return;
    }

    const handler = (window as any).PaystackPop.setup({
      key: config.paystack.publicKey,
      email: user?.email || 'customer@databundle.com.gh', 
      amount: Math.round(amount * 100), // Paystack expects amount in pesewas/kobo
      currency: 'GHS',
      metadata,
      callback: (response: any) => onSuccess(response),
      onClose: () => onClose(),
    });

    handler.openIframe();
  };

  return {
    isPaystackLoaded: loaded,
    initializePayment,
  };
}
