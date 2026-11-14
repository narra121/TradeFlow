import { addDays, endOfMonth, startOfMonth, startOfWeek } from 'date-fns';
import { openDayKey } from '@/lib/appTimeZone';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { accountCurrency } from '@/lib/format';
import { realisedR } from '@/lib/tradeFilters';
import type { Trade, TradingAccount } from '@/types/trade';

export type CalendarMetric = 'pnl' | 'r' | 'trades' | 'win';

export interface CurrencyNet {
  currency: string;
  net: number;
}

export interface DayCell {
  date: Date;
  key: string;
  inMonth: boolean;
  trades: Trade[];
  wins: number;
  losses: number;
  /** Per currency; trades with no account are counted in `trades` but not here. */
  byCurrency: CurrencyNet[];
  /** Trades that carry at least one broken rule. */
  ruleBreaks: number;
  /** Sum of realised R over trades that have a stop; null when none has one. */
  sumR: number | null;
}

export interface WeekRow {
  days: DayCell[];
  count: number;
  wins: number;
  losses: number;
  byCurrency: CurrencyNet[];
}

export interface MonthModel extends DaysSummary {
  weeks: WeekRow[];
}

/** A trade belongs to the calendar day it opened on in the app time zone (Settings): the day `GET /trades` lists it under and `/stats` buckets it by. */
export function tradeDayKey(t: Trade): string {
  return openDayKey(t.entryDate);
}

function addNet(list: CurrencyNet[], currency: string, amount: number) {
  const row = list.find((c) => c.currency === currency);
  if (row) row.net += amount;
  else list.push({ currency, net: amount });
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonth(value: string | null | undefined, fallback: Date = new Date()): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (!m) return startOfMonth(fallback);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? new Date(Number(m[1]), month - 1, 1) : startOfMonth(fallback);
}

/** Range the loader needs: the visible grid, which reaches into the neighbouring months. */
export function gridRange(month: Date): { startDate: string; endDate: string } {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = addDays(startOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 6);
  return { startDate: formatLocalDateOnly(start), endDate: formatLocalDateOnly(end) };
}

export interface DaysSummary {
  tradingDays: number;
  greenDays: number;
  redDays: number;
  byCurrency: CurrencyNet[];
  /** Best and worst day, only meaningful when the scope has one currency. */
  best: { key: string; net: number } | null;
  worst: { key: string; net: number } | null;
  mixed: boolean;
  tradeCount: number;
  /** Trading days that have no R because no trade carried a stop loss. */
  withoutR: number;
}

/** Figures of any set of days: a month, one week of the week view. */
export function summarizeDays(days: DayCell[]): DaysSummary {
  const net: CurrencyNet[] = [];
  const dayNets: { key: string; net: number }[] = [];
  let tradingDays = 0;
  let green = 0;
  let red = 0;
  let tradeCount = 0;
  let withoutR = 0;
  for (const d of days) {
    if (!d.trades.length) continue;
    tradingDays += 1;
    tradeCount += d.trades.length;
    if (d.sumR === null) withoutR += 1;
    const total = d.byCurrency.reduce((sum, c) => sum + c.net, 0);
    if (d.byCurrency.length <= 1) {
      if (total > 0) green += 1;
      else if (total < 0) red += 1;
      dayNets.push({ key: d.key, net: total });
    } else if (d.wins > d.losses) {
      // mixed currencies in one day: classify by trade outcomes instead of summing
      green += 1;
    } else if (d.losses > d.wins) {
      red += 1;
    }
    d.byCurrency.forEach((c) => addNet(net, c.currency, c.net));
  }
  const sorted = [...dayNets].sort((a, b) => b.net - a.net);
  const mixed = net.length > 1;
  return {
    tradingDays,
    greenDays: green,
    redDays: red,
    byCurrency: net,
    best: !mixed && sorted.length ? sorted[0] : null,
    worst: !mixed && sorted.length ? sorted[sorted.length - 1] : null,
    mixed,
    tradeCount,
    withoutR,
  };
}

export function buildMonth(trades: Trade[], month: Date, accounts: Map<string, TradingAccount>): MonthModel {
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = tradeDayKey(t);
    if (!k) continue;
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }

  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const last = startOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const weeks: WeekRow[] = [];

  for (let ws = first; ws <= last; ws = addDays(ws, 7)) {
    const days: DayCell[] = [];
    const weekNet: CurrencyNet[] = [];
    let weekCount = 0;
    let weekWins = 0;
    let weekLosses = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i);
      const key = formatLocalDateOnly(date);
      const inMonth = date.getMonth() === month.getMonth();
      const dayTrades = byDay.get(key) ?? [];
      const byCurrency: CurrencyNet[] = [];
      let wins = 0;
      let losses = 0;
      let ruleBreaks = 0;
      let sumR: number | null = null;
      for (const t of dayTrades) {
        if (t.pnl > 0) wins += 1;
        else if (t.pnl < 0) losses += 1;
        if (t.brokenRuleIds?.length) ruleBreaks += 1;
        const r = realisedR(t);
        if (r !== null) sumR = (sumR ?? 0) + r;
        const acc = t.accountId ? accounts.get(t.accountId) : undefined;
        if (acc) addNet(byCurrency, accountCurrency(acc), t.pnl);
      }
      days.push({ date, key, inMonth, trades: dayTrades, wins, losses, byCurrency, ruleBreaks, sumR: sumR === null ? null : Math.round(sumR * 100) / 100 });
      if (dayTrades.length) {
        weekCount += dayTrades.length;
        weekWins += wins;
        weekLosses += losses;
        byCurrency.forEach((c) => addNet(weekNet, c.currency, c.net));
      }
    }
    weeks.push({ days, count: weekCount, wins: weekWins, losses: weekLosses, byCurrency: weekNet });
  }

  return { weeks, ...summarizeDays(weeks.flatMap((w) => w.days).filter((d) => d.inMonth)) };
}

/** ISO week number (Monday start) of a date, for the `W45` label of the week column. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** The scope can colour by money only when every day has one currency; R is the default for a mixed scope. */
export function defaultMetric(mixed: boolean): CalendarMetric {
  return mixed ? 'r' : 'pnl';
}

export function parseMetric(value: string | null | undefined, mixed: boolean): CalendarMetric {
  return value === 'pnl' || value === 'r' || value === 'trades' || value === 'win' ? value : defaultMetric(mixed);
}

/** The figure a day cell is coloured by; null when the day has none for that metric (e.g. no stop for R). */
export function dayMetric(d: DayCell, metric: CalendarMetric): number | null {
  if (!d.trades.length) return null;
  switch (metric) {
    case 'pnl':
      return d.byCurrency.length === 1 ? d.byCurrency[0].net : null;
    case 'r':
      return d.sumR;
    case 'trades':
      return d.trades.length;
    case 'win':
      return Math.round((d.wins / d.trades.length) * 1000) / 10;
  }
}

export interface Tint {
  tone: 'profit' | 'loss' | 'neutral';
  step: 0 | 1 | 2 | 3;
}

/** Colour of a cell: results by sign and size; trade counts in one neutral hue; win % diverging at 50. */
export function metricTint(value: number | null, metric: CalendarMetric, maxAbs: number): Tint {
  if (value === null) return { tone: 'neutral', step: 0 };
  if (metric === 'trades') return { tone: 'neutral', step: maxAbs > 0 ? tintStep(value, maxAbs) : 0 };
  if (metric === 'win') {
    const diff = value - 50;
    return { tone: diff > 0 ? 'profit' : diff < 0 ? 'loss' : 'neutral', step: tintStep(diff, 50) };
  }
  return { tone: value > 0 ? 'profit' : value < 0 ? 'loss' : 'neutral', step: tintStep(value, maxAbs) };
}

/** The largest |value| across the visible month, the scale of the three tint steps. */
export function metricScale(model: MonthModel, metric: CalendarMetric): number {
  let max = 0;
  for (const w of model.weeks) {
    for (const d of w.days) {
      if (!d.inMonth) continue;
      const v = dayMetric(d, metric);
      if (v !== null && metric !== 'win') max = Math.max(max, Math.abs(v));
    }
  }
  return max;
}

const TINT_CLASSES = {
  profit: ['bg-[hsl(var(--tint-profit-1))]', 'bg-[hsl(var(--tint-profit-2))]', 'bg-[hsl(var(--tint-profit-3))]'],
  loss: ['bg-[hsl(var(--tint-loss-1))]', 'bg-[hsl(var(--tint-loss-2))]', 'bg-[hsl(var(--tint-loss-3))]'],
} as const;

/** Background of a heat cell for a net P&L and its step: the one scale of the dashboard month, the calendar and the timing grid. */
export function tintClass(net: number, step: 0 | 1 | 2 | 3): string {
  if (step === 0) return 'bg-muted/40';
  return TINT_CLASSES[net >= 0 ? 'profit' : 'loss'][step - 1];
}

/** 0 = no tint; 1..3 by the day's |P&L| relative to the month's largest day. */
export function tintStep(net: number, maxAbs: number): 0 | 1 | 2 | 3 {
  if (!net || maxAbs <= 0) return 0;
  const ratio = Math.abs(net) / maxAbs;
  return ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
}
