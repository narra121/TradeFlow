import { wallClock, wallToInstant, zoneOffsetMinutes } from '@/lib/appTimeZone';

/**
 * Forex trading sessions for the public market-hours clock (/resources/forex-market-hours). Each session is the local
 * business day of its city, read through the browser's time-zone database, so daylight saving follows each city's own
 * rules. Times are epoch milliseconds; days are `YYYY-MM-DD`.
 */

export type SessionId = 'sydney' | 'tokyo' | 'london' | 'newYork';

export interface SessionDef {
  id: SessionId;
  name: string;
  zone: string;
  /** Minutes after local midnight. */
  open: number;
  close: number;
}

/** The convention BabyPips publishes (forex market hours page, read 2026-11-15); sessions are not exchange hours. */
export const SESSIONS: SessionDef[] = [
  { id: 'sydney', name: 'Sydney', zone: 'Australia/Sydney', open: 7 * 60, close: 16 * 60 },
  { id: 'tokyo', name: 'Tokyo', zone: 'Asia/Tokyo', open: 9 * 60, close: 18 * 60 },
  { id: 'london', name: 'London', zone: 'Europe/London', open: 8 * 60, close: 17 * 60 },
  { id: 'newYork', name: 'New York', zone: 'America/New_York', open: 8 * 60, close: 17 * 60 },
];

/** The weekly market: Sunday 17:00 to Friday 17:00 New York time, the retail convention most brokers follow. */
const WEEK_ZONE = 'America/New_York';
const WEEK_EDGE_MIN = 17 * 60;

export interface Interval {
  start: number;
  end: number;
}

export interface SessionInterval extends Interval {
  id: SessionId;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const pad = (n: number) => String(n).padStart(2, '0');

function parseDay(day: string): { year: number; month: number; day: number } {
  const [year, month, d] = day.split('-').map(Number);
  return { year, month, day: d };
}

/** `day` moved by `n` calendar days. */
export function addDays(day: string, n: number): string {
  const { year, month, day: d } = parseDay(day);
  const t = new Date(Date.UTC(year, month - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday, for a calendar day. */
export function weekdayOf(day: string): number {
  const { year, month, day: d } = parseDay(day);
  return new Date(Date.UTC(year, month - 1, d)).getUTCDay();
}

/** `YYYY-MM-DD` an instant falls on in `zone`. */
export function dayIn(ms: number, zone: string): string {
  const w = wallClock(new Date(ms), zone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** The instant `zone`'s clock reads `minutes` after midnight on `day`. */
export function instantAt(day: string, minutes: number, zone: string): number {
  const { year, month, day: d } = parseDay(day);
  return wallToInstant({ year, month, day: d, hour: Math.floor(minutes / 60), minute: minutes % 60 }, zone).getTime();
}

/** Whether the weekly forex market is open at `ms`. */
export function isMarketOpen(ms: number): boolean {
  const w = wallClock(new Date(ms), WEEK_ZONE);
  const wd = weekdayOf(`${w.year}-${pad(w.month)}-${pad(w.day)}`);
  const minutes = w.hour * 60 + w.minute;
  if (wd === 6) return false;
  if (wd === 0) return minutes >= WEEK_EDGE_MIN;
  if (wd === 5) return minutes < WEEK_EDGE_MIN;
  return true;
}

/** Open stretches of the weekly market that touch [start, end). */
function marketWindows(start: number, end: number): Interval[] {
  const out: Interval[] = [];
  let day = addDays(dayIn(start, WEEK_ZONE), -7);
  const last = addDays(dayIn(end, WEEK_ZONE), 7);
  while (day <= last) {
    if (weekdayOf(day) === 0) {
      const open = instantAt(day, WEEK_EDGE_MIN, WEEK_ZONE);
      const close = instantAt(addDays(day, 5), WEEK_EDGE_MIN, WEEK_ZONE);
      if (close > start && open < end) out.push({ start: open, end: close });
    }
    day = addDays(day, 1);
  }
  return out;
}

function clip(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
}

/**
 * Every session interval that overlaps [start, end), clipped to the window and to the weekly market. A session runs on
 * its city's weekdays only, so Sydney's Monday morning opens with the market on Sunday evening New York time.
 */
export function sessionIntervals(start: number, end: number): SessionInterval[] {
  const week = marketWindows(start, end);
  const out: SessionInterval[] = [];
  for (const s of SESSIONS) {
    let day = addDays(dayIn(start, s.zone), -1);
    const last = addDays(dayIn(end, s.zone), 1);
    while (day <= last) {
      const wd = weekdayOf(day);
      if (wd >= 1 && wd <= 5) {
        const local = { start: instantAt(day, s.open, s.zone), end: instantAt(day, s.close, s.zone) };
        for (const w of week) {
          const inWeek = clip(local, w);
          const inWindow = inWeek && clip(inWeek, { start, end });
          if (inWindow) out.push({ id: s.id, ...inWindow });
        }
      }
      day = addDays(day, 1);
    }
  }
  return out.sort((a, b) => a.start - b.start || SESSIONS.findIndex((s) => s.id === a.id) - SESSIONS.findIndex((s) => s.id === b.id));
}

export interface Overlap extends Interval {
  a: SessionId;
  b: SessionId;
}

/** Where two sessions are open at once, in session order (Sydney-Tokyo, Tokyo-London, London-New York). */
export function overlaps(intervals: SessionInterval[]): Overlap[] {
  const out: Overlap[] = [];
  const order = SESSIONS.map((s) => s.id);
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const x = intervals[i];
      const y = intervals[j];
      if (x.id === y.id) continue;
      const both = clip(x, y);
      if (!both) continue;
      const [a, b] = order.indexOf(x.id) < order.indexOf(y.id) ? [x.id, y.id] : [y.id, x.id];
      out.push({ a, b, ...both });
    }
  }
  return out.sort((p, q) => p.start - q.start);
}

export interface ViewerDay {
  window: Interval;
  sessions: SessionInterval[];
  overlaps: Overlap[];
}

/** Sessions and overlaps on one calendar day of the viewer's zone. */
export function sessionsOnDay(day: string, viewerZone: string): ViewerDay {
  const window = { start: instantAt(day, 0, viewerZone), end: instantAt(addDays(day, 1), 0, viewerZone) };
  const sessions = sessionIntervals(window.start, window.end);
  return { window, sessions, overlaps: overlaps(sessions) };
}

export interface SessionNow {
  id: SessionId;
  open: boolean;
  /** When the session next opens (if closed) or closes (if open); null when not within the next 8 days. */
  changeAt: number | null;
}

/** Open or closed at `ms`, and when that changes, for each session. */
export function sessionsNow(ms: number): SessionNow[] {
  const ahead = sessionIntervals(ms - DAY, ms + 8 * DAY);
  return SESSIONS.map((s) => {
    const mine = ahead.filter((x) => x.id === s.id);
    const current = mine.find((x) => x.start <= ms && ms < x.end);
    if (current) return { id: s.id, open: true, changeAt: current.end };
    const next = mine.find((x) => x.start > ms);
    return { id: s.id, open: false, changeAt: next ? next.start : null };
  });
}

/** Minutes `zone` is ahead of UTC at `ms`. */
export const offsetAt = (ms: number, zone: string): number => zoneOffsetMinutes(new Date(ms), zone);

export interface ClockChange {
  zone: string;
  /** Local calendar day of the change. */
  day: string;
  fromOffset: number;
  toOffset: number;
}

/** Days in `year` on which `zone` changes its UTC offset (daylight saving starts or ends). */
export function clockChanges(year: number, zone: string): ClockChange[] {
  const out: ClockChange[] = [];
  let prev = offsetAt(Date.UTC(year, 0, 1, 12), zone);
  for (let t = Date.UTC(year, 0, 2, 12); t < Date.UTC(year + 1, 0, 1, 12); t += DAY) {
    const off = offsetAt(t, zone);
    if (off !== prev) out.push({ zone, day: dayIn(t, zone), fromOffset: prev, toOffset: off });
    prev = off;
  }
  return out;
}

export interface OverlapPeriod {
  /** First and last UTC calendar day with this overlap. */
  from: string;
  to: string;
  /** Minutes after UTC midnight; null when the two sessions do not meet. */
  startUtc: number | null;
  endUtc: number | null;
}

/** The London-New York overlap through `year`, grouped into runs of weekdays with the same UTC times. */
export function londonNewYorkByPeriod(year: number): OverlapPeriod[] {
  const out: OverlapPeriod[] = [];
  for (let day = `${year}-01-01`; day < `${year + 1}-01-01`; day = addDays(day, 1)) {
    const wd = weekdayOf(day);
    if (wd === 0 || wd === 6) continue;
    const start = instantAt(day, 0, 'UTC');
    const ov = overlaps(sessionIntervals(start, start + DAY)).find((o) => o.a === 'london' && o.b === 'newYork');
    const startUtc = ov ? Math.round((ov.start - start) / 60_000) : null;
    const endUtc = ov ? Math.round((ov.end - start) / 60_000) : null;
    const last = out[out.length - 1];
    if (last && last.startUtc === startUtc && last.endUtc === endUtc) last.to = day;
    else out.push({ from: day, to: day, startUtc, endUtc });
  }
  return out;
}

/** `HH:MM` for minutes after midnight. */
export const hhmm = (minutes: number): string => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

/** `UTC+5:30`, `UTC−5` (true minus sign) for an offset in minutes. */
export function utcOffsetText(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const a = Math.abs(minutes);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${pad(a % 60)}` : ''}`;
}

/** Where a session opens and closes on `day` of its own city, before the weekly market is applied. */
export function sessionOn(id: SessionId, day: string): Interval {
  const s = SESSIONS.find((x) => x.id === id)!;
  return { start: instantAt(day, s.open, s.zone), end: instantAt(day, s.close, s.zone) };
}

/** The London-New York overlap on `day` (the same calendar day in both cities); null when they do not meet. */
export function londonNewYorkOn(day: string): Interval | null {
  return clip(sessionOn('london', day), sessionOn('newYork', day));
}

export const DST_CITIES = { newYork: 'America/New_York', london: 'Europe/London', sydney: 'Australia/Sydney' } as const;

export type DstCity = keyof typeof DST_CITIES;

export interface DayRun {
  /** First and last UTC calendar day, both included. */
  from: string;
  to: string;
}

export interface Arrangement {
  /** Which cities are on daylight time. */
  dst: Record<DstCity, boolean>;
  runs: DayRun[];
  /** A Wednesday inside the arrangement's longest run, the day its session times are read on. */
  sample: string;
}

/**
 * `year` split by which of New York, London and Sydney are on daylight time, in order of first appearance (four
 * arrangements under the current US, UK and New South Wales rules). Each day is read at 12:00 UTC, so a change made
 * overnight on a Sunday counts from that Sunday.
 */
export function clockArrangements(year: number): Arrangement[] {
  const cities = Object.keys(DST_CITIES) as DstCity[];
  const standard = Object.fromEntries(
    cities.map((c) => [c, Math.min(offsetAt(Date.UTC(year, 0, 15, 12), DST_CITIES[c]), offsetAt(Date.UTC(year, 6, 15, 12), DST_CITIES[c]))]),
  ) as Record<DstCity, number>;
  const byKey = new Map<string, Arrangement>();
  let previous = '';
  for (let day = `${year}-01-01`; day < `${year + 1}-01-01`; day = addDays(day, 1)) {
    const noon = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), 12);
    const dst = Object.fromEntries(cities.map((c) => [c, offsetAt(noon, DST_CITIES[c]) > standard[c]])) as Record<DstCity, boolean>;
    const key = cities.map((c) => (dst[c] ? 1 : 0)).join('');
    let a = byKey.get(key);
    if (!a) byKey.set(key, (a = { dst, runs: [], sample: '' }));
    if (key === previous) a.runs[a.runs.length - 1].to = day;
    else a.runs.push({ from: day, to: day });
    previous = key;
  }
  for (const a of byKey.values()) {
    const longest = a.runs.reduce((x, y) => (daysBetween(y) > daysBetween(x) ? y : x));
    const wednesdays: string[] = [];
    for (let d = longest.from; d <= longest.to; d = addDays(d, 1)) if (weekdayOf(d) === 3) wednesdays.push(d);
    a.sample = wednesdays[Math.floor(wednesdays.length / 2)];
  }
  return [...byKey.values()];
}

const daysBetween = (r: DayRun) => Math.round((Date.parse(`${r.to}T00:00:00Z`) - Date.parse(`${r.from}T00:00:00Z`)) / DAY);
