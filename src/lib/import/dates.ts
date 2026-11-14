import { appTimeZone, wallClock, wallToInstant } from '@/lib/appTimeZone';
import type { ReviewRow } from './rows';

/**
 * Screenshot date cells, read again in the browser when the user switches the day/month order of an image.
 * readCell/resolveCell are the twin of JournalAWSSetup/src/handlers/extract-trades/dates.ts (the server's first read);
 * a change to one belongs in both.
 */

export type DateOrder = 'DMY' | 'MDY' | 'YMD';
export type DateOrderSource = 'evidence' | 'region' | 'default';

interface Clock {
  h: number;
  mi: number;
  s: number;
  frac: string | null;
}

export interface DateCell {
  kind: 'pair' | 'fixed' | 'timeOnly';
  a: number;
  b: number;
  y: number | null;
  time: Clock | null;
  zone: string | null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?/i;
const WEEKDAY_RE = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?/gi;
const TIME_RE =
  /(?:^|[\sT,;@])(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?(?:\s*([ap])\.?\s*m\.?)?(?:\s*(z|(?:utc|gmt)(?:\s*[+-]\d{1,2}(?::?\d{2})?)?|[+-]\d{2}:?\d{2}))?(?=$|[\s,;)])/i;

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function zoneOf(text: string | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, '').toUpperCase();
  if (t === 'Z' || t === 'UTC' || t === 'GMT') return 'Z';
  const m = /^(?:UTC|GMT)?([+-])(\d{1,2}):?(\d{2})?$/.exec(t);
  if (!m) return null;
  const mins = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return mins === 0 ? 'Z' : `${m[1]}${pad(Number(m[2]))}:${pad(Number(m[3] ?? 0))}`;
}

const realDay = (y: number, mo: number, d: number) => {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
};

const fullYear = (digits: string) => (digits.length === 2 ? 2000 + Number(digits) : Number(digits));

export function readCell(raw: string | null | undefined): DateCell | null {
  let rest = String(raw ?? '').trim();
  if (!rest || /^(-|—|n\/?a|none|null)$/i.test(rest)) return null;

  let time: Clock | null = null;
  let zone: string | null = null;
  const tm = TIME_RE.exec(rest);
  if (tm) {
    let h = Number(tm[1]);
    const mi = Number(tm[2]);
    const s = Number(tm[3] ?? 0);
    const ampm = tm[5]?.toLowerCase();
    if (ampm) {
      if (h < 1 || h > 12) return null;
      h = (h % 12) + (ampm === 'p' ? 12 : 0);
    }
    if (h > 23 || mi > 59 || s > 59) return null;
    time = { h, mi, s, frac: tm[4] ?? null };
    zone = zoneOf(tm[6]);
    rest = (rest.slice(0, tm.index) + ' ' + rest.slice(tm.index + tm[0].length)).trim();
  }

  rest = rest.replace(WEEKDAY_RE, ' ').replace(/\bat\b/gi, ' ').replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();
  rest = rest.replace(/^[^0-9a-z]+|[^0-9a-z.]+$/gi, '').replace(/\.$/, '');
  if (!rest) return time ? { kind: 'timeOnly', a: 0, b: 0, y: null, time, zone } : null;

  const month = MONTH_RE.exec(rest);
  if (month) {
    const mo = MONTHS.indexOf(month[1].toLowerCase()) + 1;
    const nums = (rest.slice(0, month.index) + ' ' + rest.slice(month.index + month[0].length)).match(/\d+/g) ?? [];
    let y: number | null = null;
    let d: number | undefined;
    const four = nums.findIndex((n) => n.length === 4);
    if (four >= 0) {
      y = Number(nums[four]);
      d = Number(nums.find((_, i) => i !== four));
    } else if (nums.length >= 2) {
      d = Number(nums[0]);
      y = fullYear(nums[1]);
    } else if (nums.length === 1) d = Number(nums[0]);
    if (!d || !realDay(y ?? 2000, mo, d)) return null;
    return { kind: 'fixed', a: d, b: mo, y, time, zone };
  }

  if (/^\d{8}$/.test(rest)) {
    const y = Number(rest.slice(0, 4));
    const mo = Number(rest.slice(4, 6));
    const d = Number(rest.slice(6, 8));
    return realDay(y, mo, d) ? { kind: 'fixed', a: d, b: mo, y, time, zone } : null;
  }

  const groups = rest.split(/\s*[-/.\s]\s*/).filter(Boolean);
  if (!groups.every((g) => /^\d+$/.test(g))) return null;
  if (groups.length === 3 && groups[0].length === 4) {
    const [y, mo, d] = groups.map(Number);
    return realDay(y, mo, d) ? { kind: 'fixed', a: d, b: mo, y, time, zone } : null;
  }
  if (groups.length === 3 && groups[0].length <= 2 && groups[1].length <= 2 && (groups[2].length === 4 || groups[2].length === 2)) {
    return { kind: 'pair', a: Number(groups[0]), b: Number(groups[1]), y: fullYear(groups[2]), time, zone };
  }
  if (groups.length === 2 && groups[0].length <= 2 && groups[1].length <= 2) {
    return { kind: 'pair', a: Number(groups[0]), b: Number(groups[1]), y: null, time, zone };
  }
  return null;
}

const dayNumber = (y: number, mo: number, d: number) => Date.UTC(y, mo - 1, d) / 86_400_000;

/** One cell as `YYYY-MM-DDTHH:MM:SS[.fff][zone]` under `order`; null when it is not a real date that way. Today is the app zone's. */
export function resolveCell(cell: DateCell | null, order: DateOrder, now: Date = new Date(), zone: string = appTimeZone()): string | null {
  if (!cell) return null;
  const w = wallClock(now, zone);
  const today = { y: w.year, mo: w.month, d: w.day };
  let y: number;
  let mo: number;
  let d: number;
  if (cell.kind === 'timeOnly') ({ y, mo, d } = today);
  else {
    [d, mo] = cell.kind === 'pair' && order === 'MDY' ? [cell.b, cell.a] : [cell.a, cell.b];
    if (cell.y === null) {
      y = today.y;
      if (realDay(y, mo, d) && dayNumber(y, mo, d) > dayNumber(today.y, today.mo, today.d) + 1) y -= 1;
    } else y = cell.y;
    if (!realDay(y, mo, d)) return null;
  }
  const t = cell.time ?? { h: 0, mi: 0, s: 0, frac: null };
  const frac = t.frac ? `.${t.frac.padEnd(3, '0').slice(0, 3)}` : '';
  return `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}${frac}${cell.zone ?? ''}`;
}

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?$/;

/**
 * UTC ISO of an extracted date. A value without a zone is the platform's wall clock, read on the app zone's clock (the
 * clock the review shows), seconds and milliseconds kept; a value with a zone is that instant. '' when not a date.
 */
export function extractedToUtc(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const m = WALL_RE.exec(value.trim());
  if (m) {
    const base = wallToInstant({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) });
    const ms = base.getTime() + Number(m[6] ?? 0) * 1000 + Number((m[7] ?? '0').padEnd(3, '0'));
    return Number.isNaN(ms) ? '' : new Date(ms).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** How one screenshot's dates were read; shared by every row of that screenshot. */
export interface RowDates {
  /** 1-based screenshot number in this import */
  shot: number;
  order: DateOrder;
  source: DateOrderSource;
  canSwitch: boolean;
  /** cells as copied from the screenshot ('' = blank) */
  openRaw: string;
  closeRaw: string;
  /** the screenshot has no open (close) time for the row: that date is a copy of the other one until the user sets it */
  openMissing: boolean;
  closeMissing: boolean;
  /** the cell had no year (or only a time): the latest past year (today's date) was filled in */
  filled?: 'year' | 'date';
}

/** Response contract of POST /trades/extract (JournalAWSSetup src/handlers/extract-trades ImageDates). */
export interface ExtractedImageDates {
  image: number;
  dateOrder: DateOrder;
  dateOrderSource: DateOrderSource;
  canSwitch: boolean;
  timeColumns?: { open: string | null; close: string | null };
}

/** Both dates of a row from its raw cells under `order`; a missing side falls back to the other one, as the server does. */
function datesFrom(openRaw: string, closeRaw: string, order: DateOrder) {
  const open = resolveCell(readCell(openRaw), order);
  const close = resolveCell(readCell(closeRaw), order);
  return {
    openDate: extractedToUtc(open ?? close ?? ''),
    closeDate: extractedToUtc(close ?? open ?? ''),
    openMissing: !open && !!close,
    closeMissing: !close && !!open,
  };
}

/** Re-reads every unsaved row of screenshot `shot` with the other day/month order. */
export function switchDateOrder(rows: ReviewRow[], shot: number): ReviewRow[] {
  return rows.map((r) => {
    if (!r.dates || r.dates.shot !== shot || r.saved || r.dates.order === 'YMD') return r;
    const order: DateOrder = r.dates.order === 'DMY' ? 'MDY' : 'DMY';
    const next = datesFrom(r.dates.openRaw, r.dates.closeRaw, order);
    return {
      ...r,
      trade: { ...r.trade, openDate: next.openDate, closeDate: next.closeDate },
      dates: { ...r.dates, order, openMissing: next.openMissing, closeMissing: next.closeMissing },
    };
  });
}

export interface DateReading {
  shot: number;
  order: 'DMY' | 'MDY';
  source: DateOrderSource;
  /** a raw cell of the screenshot and how it is read now, e.g. `03/12/2025 08:41` → its ISO */
  example: { raw: string; iso: string } | null;
}

/** Screenshots whose day/month order could be either way, for the review's "read as" switch. */
export function switchableReadings(rows: ReviewRow[]): DateReading[] {
  const out = new Map<number, DateReading>();
  for (const r of rows) {
    const d = r.dates;
    if (!d || !d.canSwitch || d.order === 'YMD' || r.saved || out.has(d.shot)) continue;
    const raw = d.closeRaw || d.openRaw;
    const iso = d.closeRaw ? r.trade.closeDate : r.trade.openDate;
    out.set(d.shot, { shot: d.shot, order: d.order, source: d.source, example: raw && iso ? { raw, iso } : null });
  }
  return [...out.values()].sort((a, b) => a.shot - b.shot);
}
