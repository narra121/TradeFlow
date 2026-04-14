import { useState, useCallback } from 'react';
import { stripeApi } from '@/lib/api/stripe';

interface StripeSubscriptionOptions {
  planId: string;
  onSuccess?: (subscriptionId: string) => void;
  onFailure?: (error: any) => void;
}

/**
 * Stripe Checkout hook using redirect flow.
 *
 * Flow:
 * 1. Creates a Checkout Session on the backend
 * 2. Redirects the user to Stripe's hosted checkout page
 * 3. After payment, Stripe redirects back to /app/profile?session_id=cs_xxx
 * 4. The ProfileView detects session_id and calls verifyCheckoutSession()
 */
export const useStripeCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateSubscription = useCallback(
    async (options: StripeSubscriptionOptions) => {
      try {
        setLoading(true);
        setError(null);

        const currentUrl = window.location.origin;
        const response = await stripeApi.createCheckoutSession({
          planId: options.planId,
          successUrl: `${currentUrl}/app/profile?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${currentUrl}/app/profile?checkout=cancelled`,
        });

        if (!response.checkoutUrl) {
          throw new Error('No checkout URL received from server');
        }

        // Redirect to Stripe Checkout (full page redirect)
        window.location.href = response.checkoutUrl;
      } catch (err: any) {
        console.error('Stripe checkout error:', err);
        setError(err.message || 'Failed to initiate subscription');
        setLoading(false);
        options.onFailure?.(err);
      }
      // Note: loading stays true during redirect — page will unload
    },
    []
  );

  return {
    initiateSubscription,
    loading,
    error,
  };
};
