import { addDays, addMonths, addYears, differenceInCalendarDays } from 'date-fns';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { tradeDayKey } from '@/lib/calendar';
import { parseLocalDate } from '@/lib/format';
import type { DatePreset } from '@/lib/scope';
import type { Trade, TradingAccount } from '@/types/trade';

export interface Attention {
  key: 'no-account' | 'no-strategy' | 'no-screenshot' | 'no-lesson';
  label: string;
  count: number;
}

/** Five housekeeping tallies over the loaded scope; zero-count rows are dropped. */
export function needsAttention(trades: Trade[]): Attention[] {
  const noAccount = trades.filter((t) => !t.accountId).length;
  const noStrategy = trades.filter((t) => !(t.strategy || t.setup)).length;
  const noShot = trades.filter((t) => !t.images || t.images.length === 0).length;
  const noLesson = trades.filter((t) => t.pnl < 0 && !t.keyLesson).length;
  const rows: Attention[] = [
    { key: 'no-account', label: `${noAccount} ${noAccount === 1 ? 'trade has' : 'trades have'} no account`, count: noAccount },
    { key: 'no-strategy', label: `${noStrategy} ${noStrategy === 1 ? 'trade has' : 'trades have'} no strategy`, count: noStrategy },
    { key: 'no-screenshot', label: `${noShot} ${noShot === 1 ? 'trade has' : 'trades have'} no screenshot`, count: noShot },
    { key: 'no-lesson', label: `${noLesson} losing ${noLesson === 1 ? 'trade has' : 'trades have'} no key lesson`, count: noLesson },
  ];
  return rows.filter((r) => r.count > 0);
}

export interface TodaySummary {
  count: number;
  byCurrency: { currency: string; net: number }[];
}

export function todaySummary(trades: Trade[], accounts: Map<string, TradingAccount>, now: Date = new Date()): TodaySummary {
  const today = formatLocalDateOnly(now);
  const list = trades.filter((t) => tradeDayKey(t) === today);
  const byCurrency: { currency: string; net: number }[] = [];
  for (const t of list) {
    const acc = t.accountId ? accounts.get(t.accountId) : undefined;
    if (!acc) continue;
    const cur = acc.currency || 'USD';
    const row = byCurrency.find((c) => c.currency === cur);
    if (row) row.net += t.pnl;
    else byCurrency.push({ currency: cur, net: t.pnl });
  }
  return { count: list.length, byCurrency };
}

/** Net per account currency across the loaded trades, largest trade count first (used while /stats cannot group by currency). */
export function netByCurrency(trades: Trade[], accounts: Map<string, TradingAccount>): { currency: string; net: number; trades: number }[] {
  const out = new Map<string, { currency: string; net: number; trades: number }>();
  for (const t of trades) {
    const acc = t.accountId ? accounts.get(t.accountId) : undefined;
    if (!acc) continue;
    const cur = acc.currency || 'USD';
    const row = out.get(cur) ?? { currency: cur, net: 0, trades: 0 };
    row.net += t.pnl;
    row.trades += 1;
    out.set(cur, row);
  }
  return [...out.values()].sort((a, b) => b.trades - a.trades);
}

export interface EquityPoint {
  date: string;
  label: string;
  day: number;
  cumulative: number;
}

export function equitySeries(daily: { date: string; pnl: number; cumulativePnl: number }[] | undefined, labelOf: (d: string) => string): EquityPoint[] {
  return (daily ?? []).map((d) => ({ date: d.date, label: labelOf(d.date), day: d.pnl, cumulative: d.cumulativePnl }));
}

export interface PreviousPeriod {
  startDate: string;
  endDate: string;
  /** Short name for `vs <name>`: a month abbreviation for a calendar month, otherwise `previous period`. */
  name: string;
  /** Long form for screen readers. */
  spokenName: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The equal period before the one shown; `null` for All time. A month preset compares with the whole previous
 * month, a week with the whole previous week.
 */
export function previousPeriod(preset: DatePreset, startDate: string, endDate: string): PreviousPeriod | null {
  if (preset === 'all') return null;
  const from = parseLocalDate(startDate);
  const to = parseLocalDate(endDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const fmt = formatLocalDateOnly;
  if (preset === 'thisWeek') {
    return { startDate: fmt(addDays(from, -7)), endDate: fmt(addDays(to, -7)), name: 'last week', spokenName: 'last week' };
  }
  if (preset === 'thisMonth') {
    const start = addMonths(from, -1);
    return { startDate: fmt(start), endDate: fmt(addDays(from, -1)), name: MONTH_SHORT[start.getMonth()], spokenName: MONTH_LONG[start.getMonth()] };
  }
  if (preset === 'last1Year' || preset === 365) {
    return { startDate: fmt(addYears(from, -1)), endDate: fmt(addYears(to, -1)), name: 'previous period', spokenName: 'the previous period' };
  }
  const length = Math.max(1, differenceInCalendarDays(to, from) + 1);
  return { startDate: fmt(addDays(from, -length)), endDate: fmt(addDays(to, -length)), name: 'previous period', spokenName: 'the previous period' };
}

export interface ChartPoint extends EquityPoint {
  /** Running peak of the cumulative line, starting at 0; the gap to `cumulative` is the drawdown. */
  peak: number;
}

/** Beyond this many days the daily bars become weekly bars. */
export const WEEKLY_BUCKET_DAYS = 92;

function mondayKey(date: string): string {
  const d = parseLocalDate(date);
  return formatLocalDateOnly(addDays(d, -((d.getDay() + 6) % 7)));
}

/** Adds the running peak; beyond 92 days the rows are summed into Monday-start weeks (cumulative = last day of the week). */
export function chartSeries(points: EquityPoint[], labelOf: (d: string) => string): { points: ChartPoint[]; bucket: 'day' | 'week' } {
  let rows = points;
  let bucket: 'day' | 'week' = 'day';
  const span = points.length > 1 ? differenceInCalendarDays(parseLocalDate(points[points.length - 1].date), parseLocalDate(points[0].date)) + 1 : 0;
  if (span > WEEKLY_BUCKET_DAYS) {
    bucket = 'week';
    const weeks = new Map<string, EquityPoint>();
    for (const p of points) {
      const key = mondayKey(p.date);
      const w = weeks.get(key);
      if (w) {
        w.day += p.day;
        w.cumulative = p.cumulative;
      } else {
        weeks.set(key, { date: key, label: labelOf(key), day: p.day, cumulative: p.cumulative });
      }
    }
    rows = [...weeks.values()];
  }
  let peak = 0;
  return {
    bucket,
    points: rows.map((p) => {
      peak = Math.max(peak, p.cumulative);
      return { ...p, peak };
    }),
  };
}

interface ProgressItem {
  current: number;
  target: number;
}

export interface WeekGoal {
  type: 'profit' | 'winRate' | 'maxDrawdown' | 'tradeCount';
  label: string;
  current: number;
  target: number;
  /** Limits (drawdown, trades) are used up; targets (profit, win rate) are reached. */
  limit: boolean;
  over: boolean;
  statusText: string;
}

/**
 * Goal tracks of the current week for the goals the user has set (`setTypes` = goalType values of real goals).
 * Empty when none are set: the server fills default targets, which must not be judged as the user's goals.
 */
export function weekGoals(progress: Record<'profit' | 'winRate' | 'maxDrawdown' | 'tradeCount', ProgressItem> | undefined, setTypes: string[]): WeekGoal[] {
  if (!progress) return [];
  const out: WeekGoal[] = [];
  if (setTypes.includes('profit')) {
    const p = progress.profit;
    out.push({ type: 'profit', label: 'Profit', ...p, limit: false, over: false, statusText: p.current >= p.target ? 'Reached' : p.current > 0 ? 'On pace' : 'Below' });
  }
  if (setTypes.includes('winRate')) {
    const p = progress.winRate;
    out.push({ type: 'winRate', label: 'Win rate', ...p, limit: false, over: false, statusText: p.current >= p.target ? 'Reached' : 'Below' });
  }
  if (setTypes.includes('maxDrawdown')) {
    const p = progress.maxDrawdown;
    out.push({ type: 'maxDrawdown', label: 'Drawdown', ...p, limit: true, over: p.current > p.target, statusText: p.current > p.target ? 'Over' : 'Within' });
  }
  if (setTypes.includes('maxTrades')) {
    const p = progress.tradeCount;
    out.push({ type: 'tradeCount', label: 'Trades', ...p, limit: true, over: p.current > p.target, statusText: p.current > p.target ? 'Over' : `${Math.max(0, p.target - p.current)} left` });
  }
  return out;
}

/** Monday-start current week: the date range and `week#YYYY-MM-DD` key the goals endpoint takes. */
export function currentWeek(now: Date = new Date()): { start: string; end: string; periodKey: string } {
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const start = formatLocalDateOnly(monday);
  return { start, end: formatLocalDateOnly(addDays(monday, 6)), periodKey: `week#${start}` };
}

/** A day (or the Monday of a week bucket) opened in Calendar. */
export function calendarHref(date: string): string {
  return `/app/calendar?month=${date.slice(0, 7)}&day=${date}`;
}

const MISSING: Record<Attention['key'], string> = { 'no-account': 'account', 'no-strategy': 'strategy', 'no-screenshot': 'screenshot', 'no-lesson': 'lesson' };

/** Trades link of a Needs attention row (the `missing` filter is read by Trades; see REQUESTS). */
export function attentionLink(key: Attention['key']): string {
  return `/app/tradelog?missing=${MISSING[key]}&src=dashboard`;
}
