import { useState } from 'react';
import { DataPackage } from '@/types/supplier';
import { usePaystack } from './usePaystack';
import { OrderStep } from '@/components/features/OrderProgress';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { processPurchaseAction } from '@/app/actions/purchase-actions';

export type PaymentMethod = 'WALLET' | 'MOMO';

export function usePurchaseFlow() {
  const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderStep, setActiveOrderStep] = useState<OrderStep | null>(null);

  const { user } = useAuth();
  const router = useRouter();
  const { initializePayment, isPaystackLoaded } = usePaystack();

  const openPurchaseModal = (pkg: DataPackage) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
    setPaymentMethod(user ? 'WALLET' : 'MOMO');
    setError(null);
  };

  const closePurchaseModal = () => {
    setIsModalOpen(false);
    setSelectedPackage(null);
    setPhoneNumber('');
    setError(null);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !phoneNumber) {
      setError('Please fill in all fields');
      return;
    }
    
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    if (paymentMethod === 'MOMO' && !isPaystackLoaded) {
      setError('Payment system is still loading. Please wait a moment.');
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    const referringAgentId = !user ? localStorage.getItem('referring_agent_id') : null;

    // SYSTEM MAINTENANCE CHECKS (Fetching from Supabase for real-time accuracy)
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global_config')
      .single();

    if (settings) {
      if (settings.maintenance_global) {
        setError('SYSTEM MAINTENANCE: We are currently performing scheduled platform upgrades. Please check back shortly.');
        setIsProcessing(false);
        return;
      }

      const networkKey = `maintenance_${selectedPackage.supplier.toLowerCase()}` as keyof typeof settings;
      if (settings[networkKey]) {
        setError(`${selectedPackage.supplier} OUTAGE: Services for this network are currently unavailable. Our engineers are working on a fix.`);
        setIsProcessing(false);
        return;
      }
    }

    // 2. TRIGGER SERVER-SIDE PROCESSING
    if (paymentMethod === 'WALLET') {
      setActiveOrderStep('PENDING');
      
      const result = await processPurchaseAction({
        packageId: selectedPackage.id,
        phoneNumber: phoneNumber,
        paymentMethod: 'WALLET',
        agentId: user?.id,
      });

      setIsProcessing(false);
      closePurchaseModal();

      if (result.success) {
        setActiveOrderStep('DELIVERED');
      } else {
        setError(result.error || 'Failed to process order');
        setActiveOrderStep(null);
      }
      
      setTimeout(() => setActiveOrderStep(null), 10000);

    } else {
      // MOMO Flow
      initializePayment({
        amount: selectedPackage.price,
        metadata: {
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          recipient: phoneNumber,
          agentId: user?.id || 'GUEST',
          referringAgentId: referringAgentId,
          type: user ? 'DIRECT' : (referringAgentId ? 'LINK' : 'WEB')
        },
        onSuccess: async (response) => {
          setActiveOrderStep('PAID');
          setIsProcessing(false);
          closePurchaseModal();

          // Notify server of the payment reference for tracking
          await processPurchaseAction({
            packageId: selectedPackage.id,
            phoneNumber: phoneNumber,
            paymentMethod: 'MOMO',
            agentId: user?.id,
            referringAgentId: referringAgentId,
            paymentReference: response.reference
          });
          
          setActiveOrderStep('PENDING');
          
          // Note: In production, we'd poll the DB for the transaction status 
          // which is updated by the Paystack webhook.
          setTimeout(() => setActiveOrderStep('DELIVERED'), 3000);
          setTimeout(() => setActiveOrderStep(null), 12000);
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });
    }
  };

  return {
    selectedPackage,
    isModalOpen,
    phoneNumber,
    paymentMethod,
    setPaymentMethod,
    isProcessing,
    error,
    setPhoneNumber,
    openPurchaseModal,
    closePurchaseModal,
    handlePurchase,
    activeOrderStep,
  };
}
