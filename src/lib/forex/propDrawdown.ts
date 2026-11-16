/**
 * Room left under a prop-firm challenge's loss limits, for the public calculator (/resources/prop-firm-drawdown-calculator).
 * Amounts are in the account currency. Firms define their limits differently; the inputs name each choice (which balance
 * the daily limit is a share of, static or trailing overall limit) instead of assuming one firm's rules.
 */

export type DailyBasis = 'initial' | 'dayStart';
export type MaxType = 'static' | 'trailing';

export interface DrawdownInput {
  /** Account size at the start of the challenge. */
  initial: number;
  /** Balance (or equity, if the firm uses it) when today's trading day began. */
  dayStart: number;
  /** Equity now: balance plus the open P&L. */
  current: number;
  /** Highest balance so far; used only by a trailing limit. Values below `initial` count as `initial`. */
  peak: number;
  /** Percent, above 0 and below 100. */
  dailyPct: number;
  dailyBasis: DailyBasis;
  /** Percent, above 0 and below 100. */
  maxPct: number;
  maxType: MaxType;
  /** Trailing only: the floor stops rising once it reaches the starting balance. */
  lockAtInitial: boolean;
  /** Percent; 0 or absent = no target. */
  targetPct?: number;
}

export type DrawdownError = 'initial' | 'balances' | 'daily-range' | 'max-range' | 'target-range';

export interface DrawdownResult {
  status: 'ok';
  dailyLimit: number;
  /** Equity at which today's limit is reached. */
  dailyFloor: number;
  maxLoss: number;
  /** Equity at which the overall limit is reached. */
  maxFloor: number;
  /** The higher of the two floors: the one reached first. */
  floor: number;
  binding: 'daily' | 'max';
  /** Equity above each floor; negative = already past it. */
  roomDaily: number;
  roomMax: number;
  room: number;
  /** Share of today's limit already lost, percent (0 when the day is flat or up). */
  usedDailyPct: number;
  breached: boolean;
  target: number | null;
  toTarget: number | null;
}

export type DrawdownOutcome = DrawdownResult | { status: 'error'; error: DrawdownError };

const fin = (n: number) => Number.isFinite(n);
const pctOk = (n: number) => fin(n) && n > 0 && n < 100;

export function drawdownRoom(i: DrawdownInput): DrawdownOutcome {
  if (!fin(i.initial) || i.initial <= 0) return { status: 'error', error: 'initial' };
  if (![i.dayStart, i.current, i.peak].every(fin) || i.dayStart <= 0 || i.current < 0) return { status: 'error', error: 'balances' };
  if (!pctOk(i.dailyPct)) return { status: 'error', error: 'daily-range' };
  if (!pctOk(i.maxPct)) return { status: 'error', error: 'max-range' };
  const targetPct = i.targetPct ?? 0;
  if (!fin(targetPct) || targetPct < 0) return { status: 'error', error: 'target-range' };

  const dailyLimit = ((i.dailyBasis === 'initial' ? i.initial : i.dayStart) * i.dailyPct) / 100;
  const dailyFloor = i.dayStart - dailyLimit;
  const maxLoss = (i.initial * i.maxPct) / 100;
  const peak = Math.max(i.peak, i.initial);
  let maxFloor = i.initial - maxLoss;
  if (i.maxType === 'trailing') maxFloor = i.lockAtInitial ? Math.min(peak - maxLoss, i.initial) : peak - maxLoss;

  const binding = dailyFloor >= maxFloor ? 'daily' : 'max';
  const floor = Math.max(dailyFloor, maxFloor);
  const roomDaily = i.current - dailyFloor;
  const roomMax = i.current - maxFloor;
  const target = targetPct > 0 ? i.initial * (1 + targetPct / 100) : null;
  return {
    status: 'ok',
    dailyLimit,
    dailyFloor,
    maxLoss,
    maxFloor,
    floor,
    binding,
    roomDaily,
    roomMax,
    room: Math.min(roomDaily, roomMax),
    usedDailyPct: (Math.max(0, i.dayStart - i.current) / dailyLimit) * 100,
    breached: i.current <= floor,
    target,
    toTarget: target === null ? null : target - i.current,
  };
}

/** Lots whose loss at the stop fits in `room`, rounded down to 0.01; 0 when nothing fits. */
export function lotsWithinRoom(room: number, stopPips: number, pipValuePerLot: number): number {
  if (!(room > 0) || !(stopPips > 0) || !(pipValuePerLot > 0)) return 0;
  return Math.floor((room / (stopPips * pipValuePerLot)) * 100 + 1e-9) / 100;
}
