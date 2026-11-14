import { formatLocalDateOnly } from '@/lib/dateUtils';
import type { Trade } from '@/types/trade';

export interface TimelineBlock {
  trade: Trade;
  /** Minutes from midnight, clipped to the day the trade opened on. */
  start: number;
  end: number;
  lane: number;
  lanes: number;
  /** Set when the trade opened within 15 minutes of a losing close: how many minutes after. */
  afterLoss: number | null;
}

export const AFTER_LOSS_WINDOW = 15;

const minutesOf = (d: Date): number => d.getHours() * 60 + d.getMinutes();

/** Start and end of a trade within its opening day. A trade that closes on a later day ends at midnight. */
export function tradeSpan(t: Trade): { start: number; end: number } | null {
  const entry = new Date(t.entryDate);
  const exit = new Date(t.exitDate || t.entryDate);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) return null;
  const start = minutesOf(entry);
  const end = formatLocalDateOnly(entry) === formatLocalDateOnly(exit) ? Math.max(start, minutesOf(exit)) : 24 * 60;
  return { start, end };
}

/** Exit minute of every losing trade, by day: the reference for the "after a loss" marker. */
export function lossExits(trades: Trade[]): { exit: number; day: string }[] {
  const out: { exit: number; day: string }[] = [];
  for (const t of trades) {
    if (t.pnl >= 0) continue;
    const exit = new Date(t.exitDate || t.entryDate);
    if (Number.isNaN(exit.getTime())) continue;
    out.push({ exit: minutesOf(exit), day: formatLocalDateOnly(exit) });
  }
  return out;
}

/** Lays the trades of one day side by side where they overlap in time. */
export function layoutDay(trades: Trade[], losses: { exit: number; day: string }[], day: string): TimelineBlock[] {
  const spans = trades
    .map((trade) => ({ trade, span: tradeSpan(trade) }))
    .filter((x): x is { trade: Trade; span: { start: number; end: number } } => x.span !== null)
    .sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end);
  const laneEnds: number[] = [];
  const placed = spans.map(({ trade, span }) => {
    let lane = laneEnds.findIndex((end) => end <= span.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = Math.max(span.end, span.start + 1);
    const gaps = losses.filter((l) => l.day === day && l.exit <= span.start && span.start - l.exit <= AFTER_LOSS_WINDOW).map((l) => span.start - l.exit);
    return { trade, start: span.start, end: span.end, lane, lanes: 1, afterLoss: gaps.length ? Math.min(...gaps) : null };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((b) => ({ ...b, lanes }));
}

/** The hours the week's trades span, padded by an hour, so the axis is not 00:00-24:00 for a London-session trader. */
export function axisRange(trades: Trade[]): { from: number; to: number } {
  let lo = 24 * 60;
  let hi = 0;
  for (const t of trades) {
    const s = tradeSpan(t);
    if (!s) continue;
    lo = Math.min(lo, s.start);
    hi = Math.max(hi, s.end);
  }
  if (hi === 0 && lo === 24 * 60) return { from: 8 * 60, to: 18 * 60 };
  const from = Math.max(0, Math.floor(lo / 60) - 1) * 60;
  const to = Math.min(24, Math.ceil(hi / 60) + 1) * 60;
  return { from, to: Math.max(to, from + 4 * 60) };
}
