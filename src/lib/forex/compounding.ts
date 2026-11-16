/**
 * Compound growth for the public calculator (/resources/compounding-calculator). A period's return applies to the
 * balance at its start; a deposit is added at the end of each period, after that period's return.
 */

export type Period = 'day' | 'week' | 'month';

/** Trading periods in a year (forex trades 5 days a week: 52 × 5 = 260 days), used only to state a per-period rate as a yearly one. */
export const PERIODS_PER_YEAR: Record<Period, number> = { day: 260, week: 52, month: 12 };

export interface CompoundInput {
  start: number;
  /** Return per period, percent; may be negative (above −100). */
  ratePct: number;
  /** Whole number of periods, 1 to 1,000. */
  periods: number;
  /** Added at the end of every period; 0 = none. */
  deposit?: number;
}

export type CompoundError = 'start' | 'rate' | 'periods' | 'deposit';

export interface CompoundRow {
  period: number;
  /** Return earned in this period. */
  gain: number;
  balance: number;
}

export interface CompoundResult {
  status: 'ok';
  final: number;
  deposits: number;
  /** final − start − deposits. */
  totalGain: number;
  /** totalGain as a percent of everything put in (start + deposits). */
  totalGainPct: number;
  rows: CompoundRow[];
}

export type CompoundOutcome = CompoundResult | { status: 'error'; error: CompoundError };

export function compound(i: CompoundInput): CompoundOutcome {
  const deposit = i.deposit ?? 0;
  if (!(i.start >= 0) || !Number.isFinite(i.start)) return { status: 'error', error: 'start' };
  if (!Number.isFinite(i.ratePct) || i.ratePct <= -100) return { status: 'error', error: 'rate' };
  if (!Number.isInteger(i.periods) || i.periods < 1 || i.periods > 1000) return { status: 'error', error: 'periods' };
  if (!Number.isFinite(deposit) || deposit < 0) return { status: 'error', error: 'deposit' };
  if (i.start === 0 && deposit === 0) return { status: 'error', error: 'start' };

  const r = i.ratePct / 100;
  const rows: CompoundRow[] = [];
  let balance = i.start;
  for (let n = 1; n <= i.periods; n++) {
    const gain = balance * r;
    balance += gain + deposit;
    rows.push({ period: n, gain, balance });
  }
  const deposits = deposit * i.periods;
  const totalGain = balance - i.start - deposits;
  return { status: 'ok', final: balance, deposits, totalGain, totalGainPct: (totalGain / (i.start + deposits)) * 100, rows };
}

/** A per-period rate as the yearly rate it compounds to, percent. */
export function yearlyEquivalentPct(ratePct: number, period: Period): number {
  return ((1 + ratePct / 100) ** PERIODS_PER_YEAR[period] - 1) * 100;
}

/** Per-period rate, percent, that grows `start` to `target` in `periods` with no deposits; null when it cannot. */
export function requiredRatePct(start: number, target: number, periods: number): number | null {
  if (!(start > 0) || !(target > 0) || !(periods >= 1)) return null;
  return ((target / start) ** (1 / periods) - 1) * 100;
}
