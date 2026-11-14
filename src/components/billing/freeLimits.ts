import { PLAN_LIMITS, PRO_PRICES, proPrice, type Currency, type Interval } from '@/content/product-facts';
import { formatMoney } from '@/lib/format';

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
