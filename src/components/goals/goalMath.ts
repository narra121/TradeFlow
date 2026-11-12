import { addDays, addMonths, addWeeks, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { formatMoney, formatPercent } from '@/lib/format';

export type GoalPeriod = 'weekly' | 'monthly';
export type GoalType = 'profit' | 'winRate' | 'maxDrawdown' | 'maxTrades';

export const GOAL_ORDER: GoalType[] = ['profit', 'winRate', 'maxDrawdown', 'maxTrades'];

/** Starter targets shown until the user sets their own; they never produce a verdict or a history strip. */
export const DEFAULT_TARGETS: Record<GoalPeriod, Record<GoalType, number>> = {
  weekly: { profit: 500, winRate: 65, maxDrawdown: 3, maxTrades: 8 },
  monthly: { profit: 2000, winRate: 70, maxDrawdown: 10, maxTrades: 30 },
};

export const STARTER_RULES = [
  'Never risk more than 1% per trade',
  'Always set stop loss before entry',
  'No trading during high-impact news',
  'Wait for confirmation before entry',
  'Review trades weekly',
  'Stick to my trading plan',
];

export const GOAL_LABEL: Record<GoalType, string> = {
  profit: 'Profit target',
  winRate: 'Win rate',
  maxDrawdown: 'Max drawdown — limit',
  maxTrades: 'Max trades — limit',
};

export const isLimit = (t: GoalType): boolean => t === 'maxDrawdown' || t === 'maxTrades';

export interface PeriodRef {
  period: GoalPeriod;
  start: Date;
  end: Date;
  /** Backend period key: `week#YYYY-MM-DD` (Monday) or `month#YYYY-MM`. */
  key: string;
  startDate: string;
  endDate: string;
}

export function periodOf(period: GoalPeriod, anchor: Date): PeriodRef {
  const start = period === 'weekly' ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  const end = period === 'weekly' ? addDays(start, 6) : endOfMonth(anchor);
  return {
    period,
    start,
    end,
    key: period === 'weekly' ? `week#${formatLocalDateOnly(start)}` : `month#${format(start, 'yyyy-MM')}`,
    startDate: formatLocalDateOnly(start),
    endDate: formatLocalDateOnly(end),
  };
}

export function shiftPeriod(ref: PeriodRef, delta: number): PeriodRef {
  return periodOf(ref.period, ref.period === 'weekly' ? addWeeks(ref.start, delta) : addMonths(ref.start, delta));
}

/** The 8 periods before `ref`, oldest first. */
export function previousPeriods(ref: PeriodRef, count = 8): PeriodRef[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(ref, i - count));
}

export function isCurrentPeriod(ref: PeriodRef, now: Date = new Date()): boolean {
  return periodOf(ref.period, now).key === ref.key;
}

export function isPastPeriod(ref: PeriodRef, now: Date = new Date()): boolean {
  return ref.end < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function periodLabel(ref: PeriodRef): string {
  if (ref.period === 'monthly') return format(ref.start, 'MMMM yyyy');
  const sameMonth = ref.start.getMonth() === ref.end.getMonth();
  return sameMonth ? `${format(ref.start, 'd')} – ${format(ref.end, 'd MMM yyyy')}` : `${format(ref.start, 'd MMM')} – ${format(ref.end, 'd MMM yyyy')}`;
}

export const periodNoun = (p: GoalPeriod): 'week' | 'month' => (p === 'weekly' ? 'week' : 'month');

/** Monday to Friday days of the period; the pace of a target is measured in these. */
export function tradingDays(ref: PeriodRef): { total: number; elapsed: number; left: number } {
  const today = new Date();
  const todayKey = formatLocalDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  let total = 0;
  let elapsed = 0;
  for (let d = ref.start; d <= ref.end; d = addDays(d, 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    total += 1;
    if (formatLocalDateOnly(d) <= todayKey) elapsed += 1;
  }
  return { total, elapsed, left: total - elapsed };
}

export interface GoalProgressNumbers {
  current: number;
  target: number;
}

export type StatusTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface TrackStatus {
  text: string;
  tone: StatusTone;
  /** 0..1 of the bar filled. */
  fill: number;
  /** Where the period is today (targets only), 0..1. */
  pace?: number;
  /** Where a limit starts to warn, 0..1. */
  tick?: number;
  met: boolean;
}

export interface StatusContext {
  type: GoalType;
  current: number;
  target: number;
  currency?: string;
  tradeCount: number;
  period: PeriodRef;
  /** True for an unfinished period. */
  live: boolean;
}

const POINTS = (n: number): string => `${formatPercent(Math.abs(n), 1).replace('%', '')} pts`;

/** Words for a track. Targets: pace, to go, met. Limits: within, near (80 %), exceeded. */
export function trackStatus(c: StatusContext): TrackStatus {
  const { type, current, target, currency, tradeCount, period, live } = c;
  const ratio = target > 0 ? current / target : 0;
  const days = tradingDays(period);

  if (type === 'profit') {
    const fill = Math.max(0, Math.min(1, ratio));
    const pace = live && days.total > 0 ? days.elapsed / days.total : undefined;
    // Pace arithmetic on zero trades only says "behind"; there is nothing to judge before the first trade.
    if (tradeCount === 0 && live) return { text: 'No trades yet', tone: 'neutral', fill: 0, pace, met: false };
    if (current >= target) return { text: 'Target met', tone: 'good', fill: 1, pace, met: true };
    const toGo = formatMoney(target - current, currency, { sign: false });
    if (!live) return { text: `Missed by ${toGo}`, tone: 'bad', fill, met: false };
    const expected = pace !== undefined ? target * pace : 0;
    if (current >= expected) return { text: `On pace · ${toGo} to go`, tone: 'good', fill, pace, met: false };
    return { text: `Behind by ${formatMoney(expected - current, currency, { sign: false })}`, tone: 'warn', fill, pace, met: false };
  }

  if (type === 'winRate') {
    const fill = Math.max(0, Math.min(1, ratio));
    if (tradeCount === 0) return { text: 'No trades yet', tone: 'neutral', fill: 0, met: false };
    if (current >= target) return { text: 'Target met', tone: 'good', fill: 1, met: true };
    return { text: `Below target by ${POINTS(target - current)}`, tone: live ? 'warn' : 'bad', fill, met: false };
  }

  const fill = Math.max(0, Math.min(1, ratio));
  const tick = 0.8;
  const unit = type === 'maxTrades';
  if (current > target) {
    const over = unit ? String(Math.round(current - target)) : POINTS(current - target);
    return { text: `Limit exceeded by ${over}`, tone: 'bad', fill: 1, tick, met: false };
  }
  const left = unit ? Math.max(0, Math.round(target - current)) : 0;
  const leftText = unit && live ? ` · ${left} left` : '';
  if (ratio >= tick) return { text: `Near the limit${leftText}`, tone: 'warn', fill, tick, met: true };
  return { text: `Within limit${leftText}`, tone: 'good', fill, tick, met: true };
}

export type Glyph = 'met' | 'missed' | 'none';

/** One history cell. A period with no trades, or with no goal of the user's own, has nothing to judge. */
export function historyGlyph(type: GoalType, p: { current: number; target: number; tradeCount: number } | null): Glyph {
  if (!p || p.target <= 0 || p.tradeCount === 0) return 'none';
  if (type === 'profit') return p.current >= p.target ? 'met' : 'missed';
  if (type === 'winRate') return p.current >= p.target ? 'met' : 'missed';
  return p.current <= p.target ? 'met' : 'missed';
}

/** Run of the same outcome at the end of the strip, ignoring `none` cells at the very end. */
export function streakOf(glyphs: Glyph[]): { kind: 'met' | 'missed'; length: number } | null {
  let i = glyphs.length - 1;
  while (i >= 0 && glyphs[i] === 'none') i -= 1;
  if (i < 0) return null;
  const kind = glyphs[i] as 'met' | 'missed';
  let length = 0;
  for (; i >= 0 && glyphs[i] === kind; i -= 1) length += 1;
  return { kind, length };
}

export function streakText(type: GoalType, period: GoalPeriod, s: { kind: 'met' | 'missed'; length: number } | null): string {
  if (!s || s.length < 2) return '';
  const unit = periodNoun(period);
  const n = `${s.length} ${unit}s in a row`;
  if (s.kind === 'missed') return isLimit(type) ? `Over the limit ${n}` : `Missed ${n}`;
  return isLimit(type) ? `Within the limit ${n}` : `Met ${n}`;
}

export function glyphName(type: GoalType, g: Glyph, period: PeriodRef): string {
  const label = period.period === 'weekly' ? `Week of ${format(period.start, 'd MMM')}` : format(period.start, 'MMMM yyyy');
  const word = g === 'none' ? 'no trades or no goal' : g === 'met' ? (isLimit(type) ? 'within the limit' : 'met') : isLimit(type) ? 'over the limit' : 'missed';
  return `${label}: ${word}`;
}

/** Value text of a goal in its own unit. */
export function goalValue(type: GoalType, v: number, currency?: string): string {
  switch (type) {
    case 'profit':
      return formatMoney(v, currency, { sign: false });
    case 'winRate':
    case 'maxDrawdown':
      return formatPercent(v, 1);
    case 'maxTrades':
      return `${Math.round(v).toLocaleString('en-US')}`;
  }
}

export function validateTarget(type: GoalType, raw: string): { value?: number; error?: string } {
  const text = raw.trim().replace(/,/g, '');
  const n = Number(text);
  if (!text || !Number.isFinite(n)) return { error: 'Enter a number.' };
  if (n <= 0) return { error: 'Enter a number greater than 0.' };
  if ((type === 'winRate' || type === 'maxDrawdown') && n > 100) return { error: 'Enter a percentage between 0 and 100.' };
  if (type === 'maxTrades' && !Number.isInteger(n)) return { error: 'Enter a whole number of trades.' };
  return { value: n };
}
