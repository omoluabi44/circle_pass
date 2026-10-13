import { useState, useRef, useEffect } from 'react';
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
  const activePollRef = useRef<NodeJS.Timeout | null>(null);
  const hasFulfilledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
      }
    };
  }, []);

  const initialize = async (options: PaystackOptions) => {
    hasFulfilledRef.current = false;
    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    const PaystackPop = (await import('@paystack/inline-js')).default;
    const paystack = new PaystackPop();
    const ref = options.reference;

    const triggerSuccess = (result: any) => {
      if (hasFulfilledRef.current) return;
      hasFulfilledRef.current = true;
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
        activePollRef.current = null;
      }
      setIsVerifying(false);
      options.onSuccess?.(result);
    };

    // Auto-poll in the background while popup is open:
    // If the customer transfers via Bank Transfer/USSD but never clicks "I have made the payment",
    // Paystack will confirm receipt and this poller instantly completes the order & issues tickets!
    if (ref) {
      activePollRef.current = setInterval(async () => {
        if (hasFulfilledRef.current) return;
        try {
          const result = await verifyPayment(ref);
          if (result.status === 'SUCCESS') {
            triggerSuccess(result);
          }
        } catch {
          // Ignore transient errors during polling
        }
      }, 4000);
    }
    
    paystack.resumeTransaction(options.accessCode, {
      onSuccess: async (transaction: any) => {
        if (hasFulfilledRef.current) return;
        setIsVerifying(true);
        try {
          const targetRef = transaction?.reference || transaction?.trxref || ref;
          
          if (!targetRef) {
             throw new Error("No payment reference found.");
          }

          const result = await verifyPayment(targetRef);
          
          if (result.status === 'FAILED') {
             throw new Error(result.detail || "Payment failed verification.");
          }
          
          triggerSuccess(result);
        } catch (error) {
          console.error("Payment verification error:", error);
          if (activePollRef.current) {
            clearInterval(activePollRef.current);
            activePollRef.current = null;
          }
          options.onError?.(error);
        } finally {
          setIsVerifying(false);
        }
      },
      onCancel: async () => {
        // If the user closed or cancelled the modal, check if money actually dropped on Paystack
        // before declaring the checkout cancelled.
        if (hasFulfilledRef.current) return;

        if (ref) {
          setIsVerifying(true);
          try {
            const result = await verifyPayment(ref);
            if (result.status === 'SUCCESS') {
              triggerSuccess(result);
              return;
            }
          } catch {
            // Unverified
          } finally {
            setIsVerifying(false);
          }
        }

        if (activePollRef.current) {
          clearInterval(activePollRef.current);
          activePollRef.current = null;
        }
        options.onClose?.();
      }
    });
  };

  return {
    initialize,
    isVerifying
  };
}
