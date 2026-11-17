import { wallClock, type WallClock } from '@/lib/appTimeZone';

const MINUS = '−';
export const PROFIT_FACTOR_SENTINEL = 999.99;

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$' };

export function currencySymbol(currency?: string): string {
  if (!currency) return '';
  return SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

/** An account saved without a currency is shown, summed and grouped as USD. */
export const DEFAULT_CURRENCY = 'USD';
export const accountCurrency = (account: { currency?: string } | null | undefined): string => account?.currency || DEFAULT_CURRENCY;

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Grouping follows the currency's home convention: `₹4,82,300.00`, `$482,300.00` (D.3). */
const localeFor = (currency?: string): string => (currency?.toUpperCase() === 'INR' ? 'en-IN' : 'en-US');

function group(abs: number, decimals: number, currency?: string): string {
  return abs.toLocaleString(localeFor(currency), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Sign is always the first character; negative zero is rendered as zero. */
export function formatMoney(
  value: number | null | undefined,
  currency?: string,
  opts: { sign?: boolean; decimals?: number } = {},
): string {
  if (!isNum(value)) return '—';
  const decimals = opts.decimals ?? 2;
  const rounded = Number(value.toFixed(decimals));
  const neg = rounded < 0;
  const pos = rounded > 0;
  const prefix = neg ? MINUS : opts.sign && pos ? '+' : '';
  return `${prefix}${currencySymbol(currency)}${group(Math.abs(rounded), decimals, currency)}`;
}

function trim(n: number, d = 1): string {
  return n.toFixed(d).replace(/\.0+$/, '');
}

/** Compact money for calendar cells: −1.4k, +12k, 340. `currency` picks the unit (₹ in L and Cr) and prints its symbol unless `symbol` is false (axis ticks, heat cells). */
export function formatCompactMoney(
  value: number | null | undefined,
  opts: { sign?: boolean; currency?: string; symbol?: boolean } = {},
): string {
  if (!isNum(value)) return '—';
  const abs = Math.abs(value);
  let body: string;
  if (opts.currency?.toUpperCase() === 'INR' && abs >= 100_000) body = abs >= 10_000_000 ? `${trim(abs / 10_000_000)}Cr` : `${trim(abs / 100_000)}L`;
  else if (abs >= 1_000_000) body = `${trim(abs / 1_000_000)}M`;
  else if (abs >= 1000) body = `${trim(abs / 1000)}k`;
  else body = trim(abs, abs < 100 ? 1 : 0);
  if (body === '0') return '0';
  const prefix = value < 0 ? MINUS : opts.sign ? '+' : '';
  return `${prefix}${opts.currency && opts.symbol !== false ? currencySymbol(opts.currency) : ''}${body}`;
}

export function formatPrice(value: number | null | undefined, maxDecimals = 5): string {
  if (!isNum(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

export function formatQuantity(value: number | null | undefined): string {
  if (!isNum(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function formatPercent(value: number | null | undefined, decimals = 1, opts: { sign?: boolean } = {}): string {
  if (!isNum(value)) return '—';
  const rounded = Number(value.toFixed(decimals));
  const prefix = rounded < 0 ? MINUS : opts.sign && rounded > 0 ? '+' : '';
  return `${prefix}${Math.abs(rounded).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

/** A missing R (no stop loss or exit price) is a dash; zero is a real result (e.g. +2R and −2R) and has no sign. */
export function formatR(value: number | null | undefined): string {
  if (!isNum(value)) return '—';
  const rounded = Number(value.toFixed(2));
  if (rounded === 0) return '0.00R';
  return `${rounded < 0 ? MINUS : '+'}${Math.abs(rounded).toFixed(2)}R`;
}

/** `∞` for no losses (the API sends `null`, older data 999.99) when there were wins, `—` when there are no trades. */
export function formatProfitFactor(value: number | null | undefined, wins = 1, trades = 1): string {
  if (!trades) return '—';
  if (value === null) return wins > 0 ? '∞' : '—';
  if (!isNum(value)) return '—';
  if (value >= PROFIT_FACTOR_SENTINEL) return wins > 0 ? '∞' : '—';
  return value.toFixed(2);
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (!isNum(minutes) || minutes < 0) return '—';
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Parses `YYYY-MM-DD` as a local date (new Date(str) would read it as UTC); other strings go through Date. */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `1,234`: counts always group the US way, whatever the browser's locale. */
export const formatCount = (n: number): string => n.toLocaleString('en-US');

const INSTANT = /^\d{4}-\d{2}-\d{2}[T ]/;

/**
 * What a value shows. An ISO date-time is an instant and reads on the app time zone's clock (Settings); a date-only
 * string or a Date is a calendar value already and is read as written.
 */
function clockOf(value: string | Date | null | undefined): WallClock | null {
  if (!value) return null;
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return null;
  if (typeof value === 'string' && INSTANT.test(value)) return wallClock(d);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
}

/** `04 Nov` / `04 Nov 2026`: the table form (D.3, two-digit day); headers and sentences use `formatDayText`. */
export function formatDateShort(value: string | Date | null | undefined, withYear = false): string {
  const c = clockOf(value);
  if (!c) return '—';
  return `${pad2(c.day)} ${MONTHS_SHORT[c.month - 1]}${withYear ? ` ${c.year}` : ''}`;
}

/** `4 Nov` / `4 Nov 2026`: the header and sentence form (D.3), read on the same clock as `formatDateShort`. */
export function formatDayText(value: string | Date | null | undefined, withYear = false): string {
  const c = clockOf(value);
  if (!c) return '—';
  return `${c.day} ${MONTHS_SHORT[c.month - 1]}${withYear ? ` ${c.year}` : ''}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  const c = clockOf(value);
  return c ? `${pad2(c.hour)}:${pad2(c.minute)}` : '—';
}

/** `23 Oct 17:06` (D.3: day, short month, time). */
export function formatDateTime(value: string | Date | null | undefined): string {
  const c = clockOf(value);
  return c ? `${pad2(c.day)} ${MONTHS_SHORT[c.month - 1]} ${pad2(c.hour)}:${pad2(c.minute)}` : '—';
}

export function signOf(value: number | null | undefined): 'positive' | 'negative' | 'zero' {
  if (!isNum(value)) return 'zero';
  const r = Number(value.toFixed(2));
  return r > 0 ? 'positive' : r < 0 ? 'negative' : 'zero';
}
