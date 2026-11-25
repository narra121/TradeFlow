import { applyConsentDefaults } from './consent';
import { ensureGtag, injectScript } from './gtag';

export {
  CONSENT_REGIONS,
  OPEN_CONSENT_EVENT,
  CONSENT_CHANGED_EVENT,
  readConsent,
  saveConsent,
  needsConsentBanner,
  openConsentSettings,
  inConsentRegionByTimezone,
} from './consent';
export type { ConsentChoice } from './consent';
export { observeWebVitals } from './webVitals';

/** GA4 recommended event names plus TradeQut funnel events. */
export type AnalyticsEvent =
  | 'page_view'
  | 'sign_up'
  | 'login'
  | 'first_trade'
  | 'import_completed'
  | 'ai_insight_generated'
  | 'begin_checkout'
  | 'purchase'
  | 'web_vital';

let consentBooted = false;
let gaReady = false;

export function getMeasurementId(): string {
  return String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();
}

/** False for prerender/e2e browsers (navigator.webdriver) and local hosts, so no bot or dev hits are counted. */
export function isRealVisitor(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (navigator.webdriver) return false;
  return !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}

export function bootConsent(): void {
  if (consentBooted || !isRealVisitor()) return;
  applyConsentDefaults();
  consentBooted = true;
}

/** Loads GA4 when VITE_GA_MEASUREMENT_ID is set. Page views are sent manually per SPA route change. */
export function initAnalytics(): boolean {
  if (gaReady) return true;
  const id = getMeasurementId();
  if (!id || !isRealVisitor()) return false;
  bootConsent();
  const gtag = ensureGtag();
  // The Google tag reads these only from a global `set` made before it loads; it ignores the parameters of an on-page `config`.
  gtag('set', { send_page_view: false, page_location: sanitizeLocation(window.location.href) });
  gtag('js', new Date());
  gtag('config', id, { send_page_view: false });
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  gaReady = true;
  return true;
}

/** Public content pages: the only place a third-party ad script may ever load (monetization contract); see src/content/adsLoader.ts. */
export function isAdEligiblePath(pathname: string): boolean {
  return !/^\/(app|auth|login|signup)(\/|$)/.test(pathname);
}

/** gtag attaches the page URL to every event, so each event carries the sanitized one unless it sets its own. */
export function track(name: AnalyticsEvent, params: Record<string, unknown> = {}): boolean {
  if (!gaReady || !window.gtag) return false;
  window.gtag('event', name, { page_location: sanitizeLocation(window.location.href), ...params });
  return true;
}

const KEPT_PARAMS = /^(utm_[a-z]+|gclid|gbraid|wbraid|msclkid)$/;

/** Drops every query parameter except campaign ones, so OAuth `code` and Stripe `session_id` never reach GA. */
export function sanitizeLocation(href: string): string {
  const url = new URL(href);
  const kept = new URLSearchParams();
  url.searchParams.forEach((v, k) => {
    if (KEPT_PARAMS.test(k)) kept.append(k, v);
  });
  const qs = kept.toString();
  return `${url.origin}${url.pathname}${qs ? `?${qs}` : ''}`;
}

/** One field web vital (LCP, CLS, INP) of a public page, sent when the page is hidden. */
export function trackWebVital(v: { name: string; value: number; rating: string; path: string }): boolean {
  return track('web_vital', { metric_name: v.name, metric_value: v.value, metric_rating: v.rating, page_path: v.path });
}

export function trackPageView(href: string, title: string): boolean {
  const location = sanitizeLocation(href);
  // gtag.js stamps the events it sends itself (scroll, outbound click, engagement time) with the last location set globally.
  if (gaReady && window.gtag) window.gtag('set', { page_location: location });
  return track('page_view', { page_location: location, page_path: new URL(location).pathname, page_title: title });
}

export type AuthMethod = 'email' | 'google';

export function trackSignUp(method: AuthMethod): boolean {
  return track('sign_up', { method });
}

export function trackLogin(method: AuthMethod): boolean {
  return track('login', { method });
}

/** Fires once per user per browser; call after every successful trade create. */
export function trackFirstTrade(userId: string): boolean {
  const key = `tq_first_trade_${userId}`;
  try {
    if (localStorage.getItem(key)) return false;
    const sent = track('first_trade');
    if (sent) localStorage.setItem(key, '1');
    return sent;
  } catch {
    return false;
  }
}

export function trackImportCompleted(p: { source: string; tradeCount: number }): boolean {
  return track('import_completed', { source: p.source, trade_count: p.tradeCount });
}

export function trackAiInsightGenerated(p: { period?: string } = {}): boolean {
  return track('ai_insight_generated', p.period ? { period: p.period } : {});
}

export interface CheckoutIntent {
  interval: 'month' | 'year';
  currency: 'USD' | 'INR';
  value: number;
}

const PENDING_CHECKOUT_KEY = 'tq_pending_checkout';

function proItem(c: CheckoutIntent) {
  return { item_id: `pro_${c.interval}`, item_name: 'TradeQut Pro', price: c.value, quantity: 1 };
}

/** Call right before redirecting to Stripe Checkout; the intent is kept for the purchase event on return. */
export function trackBeginCheckout(c: CheckoutIntent): boolean {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(c));
  } catch {
    // purchase will be sent without value
  }
  return track('begin_checkout', { currency: c.currency, value: c.value, items: [proItem(c)] });
}

/** Once per Stripe Checkout session id (`cs_...` in the success URL). */
export function trackPurchase(sessionId: string): boolean {
  const doneKey = `tq_purchase_${sessionId}`;
  try {
    if (localStorage.getItem(doneKey)) return false;
  } catch {
    return false;
  }
  let pending: CheckoutIntent | null = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_CHECKOUT_KEY) ?? 'null') as CheckoutIntent | null;
  } catch {
    pending = null;
  }
  const params: Record<string, unknown> = { transaction_id: sessionId };
  if (pending) Object.assign(params, { currency: pending.currency, value: pending.value, items: [proItem(pending)] });
  const sent = track('purchase', params);
  if (sent) {
    try {
      localStorage.setItem(doneKey, '1');
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    } catch {
      // already sent; a duplicate on reload is acceptable
    }
  }
  return sent;
}

/** Test-only reset of module state. */
export function __resetAnalyticsForTests(): void {
  consentBooted = false;
  gaReady = false;
}
