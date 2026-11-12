import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  OPEN_CONSENT_EVENT,
  bootConsent,
  initAnalytics,
  isAdEligiblePath,
  observeWebVitals,
  needsConsentBanner,
  trackPageView,
  trackWebVital,
  trackPurchase,
} from '@/lib/analytics';
import { loadAdSense } from '@/content/adsLoader';
import { ConsentBanner } from './ConsentBanner';

/**
 * Render once inside <BrowserRouter>. Sets consent defaults, loads GA4 (when VITE_GA_MEASUREMENT_ID
 * is set) and AdSense (content pages only), sends one page_view per route, and records `purchase`
 * when Stripe returns to /app/*?session_id=cs_... (success URL built in src/hooks/useStripeCheckout.ts).
 */
export function AnalyticsRoot() {
  const location = useLocation();
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    bootConsent();
    if (initAnalytics() && isAdEligiblePath(window.location.pathname)) {
      // Field vitals of the public page the visitor landed on; not collected inside the app.
      observeWebVitals((v) => trackWebVital({ ...v, path: window.location.pathname }));
    }
    setBannerOpen(needsConsentBanner());
    const open = () => setBannerOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  useEffect(() => {
    loadAdSense(location.pathname);
    // Helmet updates document.title after this render; read it on the next tick.
    const t = window.setTimeout(() => trackPageView(window.location.href, document.title), 0);
    const sessionId = new URLSearchParams(location.search).get('session_id');
    if (sessionId?.startsWith('cs_') && location.pathname.startsWith('/app')) trackPurchase(sessionId);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.search]);

  return bannerOpen ? <ConsentBanner onClose={() => setBannerOpen(false)} /> : null;
}
