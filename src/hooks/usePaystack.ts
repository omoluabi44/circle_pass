import { useState } from 'react';
import { verifyPayment } from '@/lib/api/payments';

interface PaystackOptions {
  accessCode: string;
  reference?: string;
  onSuccess?: (verificationResult: any) => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

export function usePaystack() {
  const [isVerifying, setIsVerifying] = useState(false);

  const initialize = async (options: PaystackOptions) => {
    const PaystackPop = (await import('@paystack/inline-js')).default;
    const paystack = new PaystackPop();
    
    paystack.resumeTransaction(options.accessCode, {
      onSuccess: async (transaction: any) => {
        setIsVerifying(true);
        try {
          // Double verify with backend to fulfill order
          // transaction.reference might be missing in some inline-js versions, 
          // so fallback to the one passed from the backend checkout response
          const ref = transaction?.reference || transaction?.trxref || options.reference;
          
          if (!ref) {
             throw new Error("No payment reference found.");
          }

          const result = await verifyPayment(ref);
          
          if (result.status === 'FAILED') {
             throw new Error(result.detail || "Payment failed verification.");
          }
          
          options.onSuccess?.(result);
        } catch (error) {
          console.error("Payment verification error:", error);
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
