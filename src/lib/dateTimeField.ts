import { wallClock } from '@/lib/appTimeZone';
import { MONTHS_SHORT } from '@/lib/format';

const MONTHS = MONTHS_SHORT.map((m) => m.toLowerCase());

const pad = (n: number) => String(n).padStart(2, '0');

/** Local `YYYY-MM-DDTHH:mm` (the form's value format) for a date. */
export function toLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `04 Nov 2026, 14:30` (D.3, 24-hour) for a local value; empty for none. */
export function formatField(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function build(y: number, m: number, d: number, h: number, min: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > 31 || h > 23 || min > 59) return null;
  const date = new Date(y, m, d, h, min);
  // Reject 31 Feb and the like instead of rolling over to March.
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return toLocalValue(date);
}

/**
 * Reads what a person types: `4 Nov 2026, 14:30`, `4 Nov 2026`, `2026-11-04 14:30`, `04/11/2026 14:30` (day first),
 * `14:30` (same day as `current`), `now`. A missing time keeps the time of `current`, or 00:00. `null` = not a date.
 */
export function parseField(text: string, current: string, now: Date = new Date()): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return '';
  // `now` on the app time zone's clock, as the wall-clock Date the rest of this parser reads with local getters.
  const clock = wallClock(now);
  const wallNow = new Date(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
  if (t === 'now') return toLocalValue(wallNow);
  const cur = current ? new Date(current) : null;
  const keep = (cur && !Number.isNaN(cur.getTime()) ? cur : null) ?? null;
  const time = (h?: string, m?: string): [number, number] => (h !== undefined && m !== undefined ? [Number(h), Number(m)] : [keep?.getHours() ?? 0, keep?.getMinutes() ?? 0]);

  let m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m) {
    const base = keep ?? wallNow;
    return build(base.getFullYear(), base.getMonth(), base.getDate(), Number(m[1]), Number(m[2]));
  }
  m = /^(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?$/.exec(t);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3));
    if (mi < 0) return null;
    const [h, min] = time(m[4], m[5]);
    return build(Number(m[3]), mi, Number(m[1]), h, min);
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2}):(\d{2}))?$/.exec(t);
  if (m) {
    const [h, min] = time(m[4], m[5]);
    return build(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min);
  }
  m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?$/.exec(t);
  if (m) {
    const [h, min] = time(m[4], m[5]);
    return build(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, min);
  }
  return null;
}
