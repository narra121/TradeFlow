import { bootConsent, isAdEligiblePath, isRealVisitor } from '@/lib/analytics';
import { injectScript } from '@/lib/analytics/gtag';

/**
 * The AdSense script loader for public content pages. It lives under src/content (public-only code) so the app bundle never
 * references ad scripts; the gate `no-app-ads` enforces that.
 */

/** The publisher id has one copy: the `google-adsense-account` meta tag in index.html, which Google reads from the static HTML without running scripts. */
function adsenseClient(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]')?.content ?? '';
}

let adsLoaded = false;

/** Ads are off at launch (owner decision D-8): the loader runs only when VITE_ADS_ENABLED is "true". */
export function adsEnabled(): boolean {
  return String(import.meta.env.VITE_ADS_ENABLED ?? '').trim() === 'true';
}

/** Loads AdSense once, only on public content paths, only for real visitors, and only after consent defaults are set. */
export function loadAdSense(pathname: string): boolean {
  if (adsLoaded || !adsEnabled() || !isAdEligiblePath(pathname) || !isRealVisitor()) return false;
  const client = adsenseClient();
  if (!client) return false;
  bootConsent();
  injectScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`, {
    crossorigin: 'anonymous',
  });
  adsLoaded = true;
  return true;
}

/** Test-only reset of module state. */
export function __resetAdsLoaderForTests(): void {
  adsLoaded = false;
}
