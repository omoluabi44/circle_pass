import { useEffect, useState } from 'react';
import PaystackPop from '@paystack/inline-js';
import { verifyPayment } from '@/lib/api/payments';

interface PaystackOptions {
  accessCode: string;
  onSuccess?: (verificationResult: any) => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

export function usePaystack() {
  const [isVerifying, setIsVerifying] = useState(false);

  const initialize = (options: PaystackOptions) => {
    const paystack = new PaystackPop();
    
    paystack.resumeTransaction(options.accessCode, {
      onSuccess: async (transaction: any) => {
        setIsVerifying(true);
        try {
          // Double verify with backend to fulfill order
          const result = await verifyPayment(transaction.reference);
          options.onSuccess?.(result);
        } catch (error) {
          options.onError?.(error);
        } finally {
          setIsVerifying(false);
        }
      },
      onCancel: () => {
        options.onClose?.();
      }
    });
  };

  return {
    initialize,
    isVerifying
  };
}
