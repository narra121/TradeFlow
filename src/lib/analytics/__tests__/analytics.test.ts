/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "https://tradequt.com/"}
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  __resetAnalyticsForTests,
  initAnalytics,
  isAdEligiblePath,
  sanitizeLocation,
  saveConsent,
  readConsent,
  needsConsentBanner,
  inConsentRegionByTimezone,
  trackBeginCheckout,
  trackFirstTrade,
  trackPageView,
  trackPurchase,
  trackSignUp,
} from '..';

function dataLayerCalls(): unknown[][] {
  return (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
}

function events(name: string) {
  return dataLayerCalls().filter((c) => c[0] === 'event' && c[1] === name);
}

function setWebdriver(value: boolean) {
  Object.defineProperty(navigator, 'webdriver', { value, configurable: true });
}

beforeEach(() => {
  __resetAnalyticsForTests();
  delete window.dataLayer;
  delete window.gtag;
  localStorage.clear();
  sessionStorage.clear();
  document.head.querySelectorAll('script[src]').forEach((s) => s.remove());
  setWebdriver(false);
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123456');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('consent defaults', () => {
  it('sets a region-scoped denied default before the global default', () => {
    expect(initAnalytics()).toBe(true);
    const consent = dataLayerCalls().filter((c) => c[0] === 'consent');
    expect(consent[0][1]).toBe('default');
    expect(consent[0][2]).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
    expect((consent[0][2] as { region: string[] }).region).toEqual(expect.arrayContaining(['DE', 'FR', 'GB', 'CH']));
    expect(consent[1]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'granted' })]);
  });

  it('re-applies a stored choice as an update', () => {
    saveConsent({ analytics: true, ads: false });
    delete window.dataLayer;
    __resetAnalyticsForTests();
    initAnalytics();
    const update = dataLayerCalls().find((c) => c[0] === 'consent' && c[1] === 'update');
    expect(update?.[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' });
    expect(readConsent()).toMatchObject({ analytics: true, ads: false });
  });

  it('shows the banner only for European time zones without a stored choice', () => {
    expect(inConsentRegionByTimezone('Europe/Berlin')).toBe(true);
    expect(inConsentRegionByTimezone('Europe/London')).toBe(true);
    expect(inConsentRegionByTimezone('Atlantic/Reykjavik')).toBe(true);
    expect(inConsentRegionByTimezone('Asia/Kolkata')).toBe(false);
    expect(inConsentRegionByTimezone('America/New_York')).toBe(false);
    expect(needsConsentBanner('Europe/Paris')).toBe(true);
    saveConsent({ analytics: false, ads: false });
    expect(needsConsentBanner('Europe/Paris')).toBe(false);
  });
});

describe('loading', () => {
  it('injects gtag.js with the env measurement id and disables automatic page views', () => {
    initAnalytics();
    expect(document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=G-TEST123456"]')).not.toBeNull();
    expect(dataLayerCalls().find((c) => c[0] === 'config')).toEqual(['config', 'G-TEST123456', { send_page_view: false }]);
  });

  it('stays off without a measurement id or in a webdriver (prerender) browser', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    expect(initAnalytics()).toBe(false);
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123456');
    setWebdriver(true);
    expect(initAnalytics()).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(trackSignUp('email')).toBe(false);
  });
});

describe('events', () => {
  beforeEach(() => {
    initAnalytics();
  });

  it('strips non-campaign query parameters from page_location', () => {
    expect(sanitizeLocation('https://tradequt.com/auth/callback?code=secret&state=x')).toBe('https://tradequt.com/auth/callback');
    expect(sanitizeLocation('https://tradequt.com/blog?utm_source=x&session_id=cs_1&gclid=g')).toBe(
      'https://tradequt.com/blog?utm_source=x&gclid=g',
    );
    trackPageView('https://tradequt.com/app/profile?session_id=cs_123', 'Profile');
    expect(events('page_view')[0][2]).toEqual({
      page_location: 'https://tradequt.com/app/profile',
      page_path: '/app/profile',
      page_title: 'Profile',
    });
  });

  it('sends sign_up with the method', () => {
    trackSignUp('google');
    expect(events('sign_up')[0][2]).toEqual({ method: 'google' });
  });

  it('sends first_trade once per user', () => {
    expect(trackFirstTrade('u1')).toBe(true);
    expect(trackFirstTrade('u1')).toBe(false);
    expect(trackFirstTrade('u2')).toBe(true);
    expect(events('first_trade')).toHaveLength(2);
  });

  it('links begin_checkout to a single purchase per Checkout session', () => {
    trackBeginCheckout({ interval: 'year', currency: 'INR', value: 1499 });
    expect(events('begin_checkout')[0][2]).toMatchObject({ currency: 'INR', value: 1499 });
    expect(trackPurchase('cs_test_1')).toBe(true);
    expect(trackPurchase('cs_test_1')).toBe(false);
    const p = events('purchase');
    expect(p).toHaveLength(1);
    expect(p[0][2]).toMatchObject({ transaction_id: 'cs_test_1', currency: 'INR', value: 1499 });
  });

  it('sends purchase without value when the checkout intent was lost', () => {
    expect(trackPurchase('cs_test_2')).toBe(true);
    expect(events('purchase')[0][2]).toEqual({ transaction_id: 'cs_test_2' });
  });
});
