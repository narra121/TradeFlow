import { PLAN_LIMITS, PRO_PRICES, proPrice, type Currency, type Interval } from '@/content/product-facts';
import { formatMoney } from '@/lib/format';

/** Free-plan numbers read from the one plan table (`product-facts.ts`), so no limit is typed twice. */
function freeNumber(featurePrefix: string): number {
  const row = PLAN_LIMITS.find((r) => r.feature.startsWith(featurePrefix));
  const n = Number.parseInt(row?.free ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

export const FREE_ACCOUNTS = freeNumber('Trading accounts');
export const FREE_BROKER_IMPORTS = freeNumber('Broker file imports');
export const FREE_AI_EXTRACTIONS = freeNumber('AI extraction');
export const FREE_AI_REPORTS = freeNumber('AI Insights');
export const FREE_CHAT_MESSAGES = freeNumber('AI Chat');

/** Plan rows shown in the app; the "Ads" row is a marketing line, not a limit. */
export const APP_PLAN_ROWS = PLAN_LIMITS.filter((r) => r.feature !== 'Ads');

/** Whole-percent saving of the yearly price against twelve months, per currency (17 % in both). */
export function yearlySavingPercent(currency: Currency): number {
  const month = PRO_PRICES.find((p) => p.currency === currency && p.interval === 'month');
  const year = PRO_PRICES.find((p) => p.currency === currency && p.interval === 'year');
  if (!month || !year) return 0;
  return Math.round((1 - year.amount / (month.amount * 12)) * 100);
}

/** `$49.99 a year` with the monthly equivalent for yearly; the one way a Pro price is written in the app. */
export function priceLine(currency: Currency, interval: Interval): { main: string; sub?: string } {
  const p = proPrice(currency, interval);
  const main = `${formatMoney(p.amount, currency)} a ${interval}`;
  return interval === 'year' ? { main, sub: `${formatMoney(p.amount / 12, currency)} a month` } : { main };
}
