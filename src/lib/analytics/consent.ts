import { ensureGtag } from './gtag';

/** EEA + UK + Switzerland: Google applies the denied default here by visitor IP. */
export const CONSENT_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];

const STORAGE_KEY = 'tq_consent_v1';
export const OPEN_CONSENT_EVENT = 'tq:open-consent';
export const CONSENT_CHANGED_EVENT = 'tq:consent-changed';

export interface ConsentChoice {
  analytics: boolean;
  ads: boolean;
  /** ISO timestamp of the decision. */
  ts: string;
}

type ConsentValue = 'granted' | 'denied';

export function toGtagConsent(choice: Pick<ConsentChoice, 'analytics' | 'ads'>): Record<string, ConsentValue> {
  const ads: ConsentValue = choice.ads ? 'granted' : 'denied';
  return {
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ConsentChoice;
    return typeof v.analytics === 'boolean' && typeof v.ads === 'boolean' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Must run before gtag.js or any advertising script loads. Order matters: the region-scoped denied default
 * first, then the global granted default, then the visitor's stored choice.
 */
export function applyConsentDefaults(): void {
  const gtag = ensureGtag();
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    region: CONSENT_REGIONS,
    wait_for_update: 500,
  });
  gtag('consent', 'default', toGtagConsent({ analytics: true, ads: true }));
  const stored = readConsent();
  if (stored) {
    gtag('consent', 'update', toGtagConsent(stored));
    if (!stored.ads) gtag('set', 'ads_data_redaction', true);
  }
}

export function saveConsent(choice: Pick<ConsentChoice, 'analytics' | 'ads'>): ConsentChoice {
  const full: ConsentChoice = { ...choice, ts: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // Private mode: the choice still applies to this page view.
  }
  const gtag = ensureGtag();
  gtag('consent', 'update', toGtagConsent(full));
  gtag('set', 'ads_data_redaction', !full.ads);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: full }));
  return full;
}

const CONSENT_TIMEZONES = /^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Faroe|Faeroe|Azores)|Arctic\/Longyearbyen)/;

/** Banner targeting only; a visitor the heuristic misses still gets Google's regional denied default. */
export function inConsentRegionByTimezone(timeZone?: string): boolean {
  let tz = timeZone;
  if (tz === undefined) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return false;
    }
  }
  return CONSENT_TIMEZONES.test(tz ?? '');
}

export function needsConsentBanner(timeZone?: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  return readConsent() === null && inConsentRegionByTimezone(timeZone);
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
