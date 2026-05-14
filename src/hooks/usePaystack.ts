'use client';

import { useEffect, useState } from 'react';
import config from '@/config';

interface PaystackProps {
  email: string;
  amount: number;
  metadata?: any;
  onSuccess: (reference: any) => void;
  onClose: () => void;
}

export function usePaystack() {
  const [loaded, setLoaded] = useState(false);

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

    const handler = (window as any).PaystackPop.setup({
      key: config.paystack.publicKey,
      email: 'customer@databundle.com.gh', // Placeholder as Paystack requires email
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
