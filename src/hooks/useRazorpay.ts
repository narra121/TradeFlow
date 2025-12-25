import { useState, useCallback } from 'react';
import {
  razorpayApi,
  CreateOrderPayload,
  VerifyPaymentPayload,
} from '@/lib/api';
import type { CreateSubscriptionPayload } from '@/lib/api/razorpay';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentOptions {
  amount: number;
  currency?: string;
  name: string;
  description: string;
  onSuccess?: (paymentId: string, orderId: string) => void;
  onFailure?: (error: any) => void;
}

interface RazorpaySubscriptionOptions {
  planId: string;
  name: string;
  description: string;
  onSuccess?: (subscriptionId: string) => void;
  onFailure?: (error: any) => void;
}

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time payment (legacy - requires Razorpay Checkout script)
  const initiatePayment = useCallback(async (options: RazorpayPaymentOptions) => {
    try {
      setLoading(true);
      setError(null);

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please include the checkout script for one-time payments.');
      }

      const orderPayload: CreateOrderPayload = {
        amount: options.amount,
        currency: options.currency || 'INR',
      };

      const orderResponse = await razorpayApi.createOrder(orderPayload);

      const razorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: options.name,
        description: options.description,
        order_id: orderResponse.orderId,
        handler: async (response: any) => {
          try {
            const verifyPayload: VerifyPaymentPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            const verificationResponse = await razorpayApi.verifyPayment(verifyPayload);

            if (verificationResponse.verified) {
              options.onSuccess?.(
                verificationResponse.paymentId,
                verificationResponse.orderId
              );
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (verifyError: any) {
            setError(verifyError.message || 'Payment verification failed');
            options.onFailure?.(verifyError);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled by user');
            options.onFailure?.(new Error('Payment cancelled'));
          },
        },
        theme: {
          color: '#10b981',
        },
      };

      const razorpayInstance = new window.Razorpay(razorpayOptions);
      razorpayInstance.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setLoading(false);
      options.onFailure?.(err);
    }
  }, []);

  // Recurring subscription payment (New Flow: Payment Link)
  const initiateSubscription = useCallback(
    async (options: RazorpaySubscriptionOptions) => {
      try {
        setLoading(true);
        setError(null);

        // No Razorpay SDK check needed for this flow

        const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKeyId || razorpayKeyId === 'rzp_test_xxxxxxxxxxxxx') {
          throw new Error('Razorpay Key ID is not configured. Please set VITE_RAZORPAY_KEY_ID in .env file');
        }

        // Create subscription on backend
        const subscriptionPayload: CreateSubscriptionPayload = {
          planId: options.planId,
          customerNotify: 1,
        };

        console.log('Creating subscription with payload:', subscriptionPayload);
        const subscriptionResponse = await razorpayApi.createSubscription(
          subscriptionPayload
        );

        console.log('Subscription created:', subscriptionResponse);

        if (subscriptionResponse.paymentLink) {
          // Open the payment link in a new tab
          window.open(subscriptionResponse.paymentLink, '_blank');
          
          // Notify success immediately as we hand off to Razorpay
          // The actual activation will be handled by webhook
          options.onSuccess?.(subscriptionResponse.subscriptionId);
        } else {
          throw new Error('No payment link received from server');
        }

      } catch (err: any) {
        console.error('Subscription error:', err);
        setError(err.message || 'Failed to initiate subscription');
        options.onFailure?.(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    initiatePayment,
    initiateSubscription,
    loading,
    error,
  };
};
