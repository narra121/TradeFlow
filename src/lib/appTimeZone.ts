import { readUiState } from '@/hooks/useUiState';
import { browserZone } from '@/components/settings/timeZones';

/**
 * The one time zone the app buckets and shows time in: the Settings preference (`ui.timeZone`, kept in step with the
 * account's zone that `/stats` uses), else this browser's. With no preference every helper reads the browser's own clock.
 */

const formatters = new Map<string, Intl.DateTimeFormat | null>();

function formatterFor(zone: string): Intl.DateTimeFormat | null {
  if (!formatters.has(zone)) {
    try {
      formatters.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
    } catch {
      formatters.set(zone, null); // not a zone this browser knows
    }
  }
  return formatters.get(zone) ?? null;
}

let browser: string | null = null;
const browserName = () => (browser ??= browserZone());

export function appTimeZone(): string {
  const saved = readUiState().timeZone;
  return saved && formatterFor(saved) ? saved : browserName();
}

export interface WallClock {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The clock fields an instant shows in `zone`. */
export function wallClock(d: Date, zone: string = appTimeZone()): WallClock {
  const f = zone === browserName() ? null : formatterFor(zone);
  if (!f) return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
  const out: Record<string, number> = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` of the day an instant falls on in `zone`. */
export function dayKeyIn(d: Date, zone?: string): string {
  const w = wallClock(d, zone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Today's `YYYY-MM-DD` in the app zone. */
export const appTodayKey = (now: Date = new Date()): string => dayKeyIn(now);

/** A Date at local midnight carrying the app zone's calendar date today: what date-fns day arithmetic and period helpers take. */
export function appToday(now: Date = new Date()): Date {
  const w = wallClock(now);
  return new Date(w.year, w.month - 1, w.day);
}

/** Minutes `zone` is ahead of UTC at an instant (negative to the west). */
export function zoneOffsetMinutes(at: Date, zone: string = appTimeZone()): number {
  const w = wallClock(at, zone);
  const minute = Math.floor(at.getTime() / 60_000) * 60_000;
  return (Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - minute) / 60_000;
}

/** The instant whose clock in `zone` reads `w`. */
export function wallToInstant(w: WallClock, zone: string = appTimeZone()): Date {
  if (zone === browserName() || !formatterFor(zone)) return new Date(w.year, w.month - 1, w.day, w.hour, w.minute);
  const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  const first = zoneOffsetMinutes(new Date(guess), zone);
  const second = zoneOffsetMinutes(new Date(guess - first * 60_000), zone);
  return new Date(guess - second * 60_000);
}

/** `YYYY-MM-DDTHH:mm` (a datetime-local value) for an instant, on the app zone's clock; empty when it is not a date. */
export function toZonedInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const w = wallClock(d);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** The instant a datetime-local value means on the app zone's clock (a value that carries its own offset is that instant); null when it is not a date. */
export function fromZonedInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value);
  if (!m) return null;
  if (m[6]) {
    const exact = new Date(value);
    return Number.isNaN(exact.getTime()) ? null : exact;
  }
  const d = wallToInstant({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) });
  return Number.isNaN(d.getTime()) ? null : d;
}
