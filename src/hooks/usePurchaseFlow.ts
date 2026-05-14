import { useState } from 'react';
import { DataPackage } from '@/types/supplier';
import { usePaystack } from './usePaystack';
import { OrderStep } from '@/components/features/OrderProgress';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SupplierService } from '@/services/supplier-service';

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

    // WALLET BALANCE CHECK (If applicable)
    if (paymentMethod === 'WALLET' && user) {
      if (user.balance < selectedPackage.price) {
        setError('Insufficient wallet balance. Please top up your account.');
        setIsProcessing(false);
        return;
      }
    }

    const processOrder = async (pMethod: PaymentMethod, ref?: string) => {
      const transactionId = ref || `ref-wallet-${Math.random().toString(36).substr(2, 9)}`;
      const commissionRate = settings?.default_commission_rate ? Number(settings.default_commission_rate) : 0.05;
      const commissionEarned = (selectedPackage.price * commissionRate);

      // 1. Create Transaction in Supabase
      const { error: txError } = await supabase.from('transactions').insert({
        agent_id: user?.id || null,
        recipient_phone: phoneNumber,
        amount: selectedPackage.price,
        commission_earned: commissionEarned,
        status: 'PAID',
        funding_source: pMethod,
        supplier_id: transactionId
      });

      if (txError) {
        console.error('Transaction logging error:', txError.message);
        setError('An error occurred while logging your order. Please contact support.');
        setIsProcessing(false);
        return;
      }

      // 2. Update User Balance if using Wallet
      if (pMethod === 'WALLET' && user) {
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            balance: user.balance - selectedPackage.price,
            commissions: (user.commissions || 0) + commissionEarned
          })
          .eq('id', user.id);

        if (balanceError) {
          console.error('Balance update error:', balanceError.message);
        }
      }

      // 3. UI Progress State Updates
      setActiveOrderStep('PAID');
      setIsProcessing(false);
      closePurchaseModal();

      // Step 2: PENDING (Processing with Supplier)
      setActiveOrderStep('PENDING');
      await supabase.from('transactions').update({ status: 'PROCESSING' }).eq('supplier_id', transactionId);

      try {
        const adapter = SupplierService.getAdapter();
        const deliveryResult = await adapter.purchaseBundle(selectedPackage.id, phoneNumber);

        if (deliveryResult.success) {
          // Step 3: DELIVERED (Final Success)
          setActiveOrderStep('DELIVERED');
          await supabase.from('transactions').update({ 
            status: 'DELIVERED',
            supplier_id: deliveryResult.transactionId || transactionId 
          }).eq('supplier_id', transactionId);
        } else {
          // Handle delivery failure
          setError(deliveryResult.message || 'Payment received, but data delivery failed. Our team has been notified.');
          await supabase.from('transactions').update({ status: 'FAILED' }).eq('supplier_id', transactionId);
        }
      } catch (err) {
        console.error('Delivery Error:', err);
        setError('A technical error occurred during delivery. Please contact support.');
      }

      // Clear progress after 10 seconds
      setTimeout(() => setActiveOrderStep(null), 10000);
    };

    if (paymentMethod === 'MOMO') {
      initializePayment({
        amount: selectedPackage.price,
        metadata: {
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          recipient: phoneNumber,
          agentId: user?.id || 'GUEST'
        },
        onSuccess: (response) => {
          processOrder('MOMO', response.reference);
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });
    } else {
      // Direct Wallet Processing
      await processOrder('WALLET');
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
