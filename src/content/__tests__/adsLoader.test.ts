/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url": "https://tradequt.com/"}
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetAnalyticsForTests, isAdEligiblePath } from '@/lib/analytics';
import { __resetAdsLoaderForTests, loadAdSense } from '../adsLoader';

function setWebdriver(value: boolean) {
  Object.defineProperty(navigator, 'webdriver', { value, configurable: true });
}

beforeEach(() => {
  __resetAnalyticsForTests();
  __resetAdsLoaderForTests();
  delete window.dataLayer;
  delete window.gtag;
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  localStorage.clear();
  setWebdriver(false);
});
afterEach(() => vi.unstubAllEnvs());

describe('AdSense loader (public pages only, off at launch)', () => {
  it('does not load AdSense unless VITE_ADS_ENABLED is true', () => {
    vi.stubEnv('VITE_ADS_ENABLED', '');
    expect(loadAdSense('/blog/x')).toBe(false);
    expect(document.querySelector('script[src*="adsbygoogle"]')).toBeNull();
    vi.unstubAllEnvs();
  });

  it('loads AdSense only on public content paths', () => {
    vi.stubEnv('VITE_ADS_ENABLED', 'true');
    expect(isAdEligiblePath('/blog/x')).toBe(true);
    expect(isAdEligiblePath('/')).toBe(true);
    for (const p of ['/app', '/app/dashboard', '/auth/callback', '/login', '/signup']) expect(isAdEligiblePath(p)).toBe(false);
    expect(loadAdSense('/app/dashboard')).toBe(false);
    expect(loadAdSense('/blog/x')).toBe(true);
    expect(document.querySelectorAll('script[src*="adsbygoogle"]').length).toBe(1);
    expect(loadAdSense('/glossary')).toBe(false);
    vi.unstubAllEnvs();
  });
});
