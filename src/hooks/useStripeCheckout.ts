import { useState, useCallback } from 'react';
import { stripeApi } from '@/lib/api/stripe';
import { toast } from 'sonner';

interface StripeSubscriptionOptions {
  planId: string;
  onSuccess?: (subscriptionId: string) => void;
  onFailure?: (error: any) => void;
}

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
          successUrl: `${currentUrl}/app/profile?checkout=success`,
          cancelUrl: `${currentUrl}/app/profile?checkout=cancelled`,
        });

        if (!response.checkoutUrl) {
          throw new Error('No checkout URL received from server');
        }

        // Open Stripe Checkout in popup
        const width = 500;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          response.checkoutUrl,
          'StripeCheckout',
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          // Fallback: redirect in same tab if popup blocked
          toast.info('Redirecting to payment page...', {
            description: 'If the page doesn\'t open, please allow popups for this site.',
          });
          window.location.href = response.checkoutUrl;
          return;
        }

        // Poll for subscription status
        await new Promise<void>((resolve) => {
          const pollInterval = setInterval(async () => {
            // Check if popup was closed by user
            if (popup.closed) {
              clearInterval(pollInterval);
              resolve();
              return;
            }

            try {
              const details = await stripeApi.getSubscription();

              if (details.status === 'active') {
                clearInterval(pollInterval);
                popup.close();
                options.onSuccess?.(details.subscriptionId || details.stripeSubscriptionId || '');
                resolve();
              }
            } catch (e) {
              // Ignore polling errors (subscription may not be propagated yet)
              console.log('Polling subscription status...', e);
            }
          }, 2000); // Poll every 2 seconds
        });
      } catch (err: any) {
        console.error('Stripe checkout error:', err);
        setError(err.message || 'Failed to initiate subscription');
        options.onFailure?.(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    initiateSubscription,
    loading,
    error,
  };
};
