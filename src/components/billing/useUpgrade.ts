import { useCallback, useState } from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useCreateCheckoutMutation, useOpenPortalMutation } from '@/store/api/billingApi';
import { proPrice, type Interval } from '@/content/product-facts';
import { trackBeginCheckout } from '@/lib/analytics';
import { readApiError } from '@/lib/apiError';

const INTERVAL_KEY = 'tq.billing.interval';

/** The interval chosen on Plan & billing, default yearly; every upgrade entry reuses it (D.11). */
export function readInterval(): Interval {
  try {
    return localStorage.getItem(INTERVAL_KEY) === 'month' ? 'month' : 'year';
  } catch {
    return 'year';
  }
}

export function saveInterval(interval: Interval): void {
  try {
    localStorage.setItem(INTERVAL_KEY, interval);
  } catch {
    // not persisted; the choice still applies on this screen
  }
}

export interface UpgradeApi {
  /** Opens Stripe Checkout for the saved interval. */
  upgrade: () => Promise<void>;
  /** Opens the Stripe customer portal (card, invoices, cancel). */
  manage: () => Promise<void>;
  /** True from the click until the redirect or an error. */
  busy: 'checkout' | 'portal' | null;
  error: string | null;
  clearError: () => void;
}

/** The one checkout and portal call for the dialog, locked previews, the plan row and the billing page. */
export function useUpgrade(): UpgradeApi {
  const ent = useEntitlements();
  const [createCheckout] = useCreateCheckoutMutation();
  const [openPortal] = useOpenPortalMutation();
  const [busy, setBusy] = useState<UpgradeApi['busy']>(null);
  const [error, setError] = useState<string | null>(null);

  const go = useCallback(async (kind: 'checkout' | 'portal', run: () => Promise<{ url: string }>, failure: string) => {
    setBusy(kind);
    setError(null);
    try {
      const { url } = await run();
      window.location.assign(url);
    } catch (e) {
      setError(readApiError(e).code === 'ALREADY_SUBSCRIBED' ? 'You already have an active Pro subscription.' : failure);
      setBusy(null);
    }
  }, []);

  const upgrade = useCallback(async () => {
    const interval = readInterval();
    await go(
      'checkout',
      async () => {
        const res = await createCheckout({ interval }).unwrap();
        trackBeginCheckout({ interval, currency: ent.currency, value: proPrice(ent.currency, interval).amount });
        return res;
      },
      "Couldn't open checkout. Try again in a moment.",
    );
  }, [createCheckout, ent.currency, go]);

  const manage = useCallback(() => go('portal', () => openPortal().unwrap(), "Couldn't open billing. Try again in a moment."), [go, openPortal]);

  return { upgrade, manage, busy, error, clearError: () => setError(null) };
}
