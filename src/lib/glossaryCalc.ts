/**
 * Arithmetic for the metric term pages under /glossary/* (profit factor, expectancy, R-multiple, win rate,
 * maximum drawdown). Amounts are in one currency, or in R, throughout a single call.
 */
import { breakEvenForRatioPct } from '@/lib/expectancy';

export type ProfitFactorOutcome =
  | { status: 'ok'; profitFactor: number; net: number }
  /** Gross loss is 0, so the ratio has no value: 'no-losses' when something won, 'no-trades' when both sums are 0. */
  | { status: 'undefined'; reason: 'no-losses' | 'no-trades'; net: number }
  | { status: 'error'; error: 'negative-profit' | 'not-a-number' };

/** Gross profit ÷ gross loss. The sign of `grossLoss` is ignored (−255 and 255 both mean 255 lost). */
export function profitFactor(grossProfit: number, grossLoss: number): ProfitFactorOutcome {
  if (!Number.isFinite(grossProfit) || !Number.isFinite(grossLoss)) return { status: 'error', error: 'not-a-number' };
  if (grossProfit < 0) return { status: 'error', error: 'negative-profit' };
  const loss = Math.abs(grossLoss);
  const net = grossProfit - loss;
  if (loss === 0) return { status: 'undefined', reason: grossProfit > 0 ? 'no-losses' : 'no-trades', net };
  return { status: 'ok', profitFactor: grossProfit / loss, net };
}

export interface TermExpectancyInput {
  /** Percent of all trades, 0 to 100. */
  winRatePct: number;
  /** Percent of all trades; omitted = 100 − win rate. Lower when some trades closed at exactly zero. */
  lossRatePct?: number;
  avgWin: number;
  /** Size of the average loss; the sign is ignored. */
  avgLoss: number;
  /** Money risked per trade (1R); omitted or 0 = use the average loss as 1R. */
  riskPerTrade?: number;
}

export type TermExpectancyError = 'win-rate-range' | 'loss-rate-range' | 'rates-over-100' | 'negative-win' | 'negative-risk' | 'not-a-number';

export type TermExpectancyOutcome =
  | {
      status: 'ok';
      expectancy: number;
      winPart: number;
      /** Negative or zero: loss rate × average loss, with its sign. */
      lossPart: number;
      /** Percent of trades that closed at zero: 100 − win rate − loss rate. */
      zeroPct: number;
      /** Null when there is no risk unit (no risk per trade and an average loss of 0). */
      expectancyR: number | null;
      rUnit: 'risk' | 'avg-loss' | null;
    }
  | { status: 'error'; error: TermExpectancyError };

/** (win rate × average win) − (loss rate × average loss), with the loss rate taken from all trades, not 1 − win rate. */
export function termExpectancy(input: TermExpectancyInput): TermExpectancyOutcome {
  const { winRatePct, avgWin } = input;
  const lossRatePct = input.lossRatePct ?? 100 - winRatePct;
  const risk = input.riskPerTrade ?? 0;
  if (![winRatePct, lossRatePct, avgWin, input.avgLoss, risk].every(Number.isFinite)) return { status: 'error', error: 'not-a-number' };
  if (winRatePct < 0 || winRatePct > 100) return { status: 'error', error: 'win-rate-range' };
  if (lossRatePct < 0 || lossRatePct > 100) return { status: 'error', error: 'loss-rate-range' };
  // A small tolerance so 33.3 + 66.7 style inputs are not rejected for floating-point noise.
  if (winRatePct + lossRatePct > 100 + 1e-9) return { status: 'error', error: 'rates-over-100' };
  if (avgWin < 0) return { status: 'error', error: 'negative-win' };
  if (risk < 0) return { status: 'error', error: 'negative-risk' };

  const loss = Math.abs(input.avgLoss);
  const winPart = (winRatePct / 100) * avgWin;
  const lossPart = -(lossRatePct / 100) * loss;
  const expectancy = winPart + lossPart;
  const unit = risk > 0 ? risk : loss;
  return {
    status: 'ok',
    expectancy,
    winPart,
    lossPart,
    zeroPct: Math.max(0, 100 - winRatePct - lossRatePct),
    expectancyR: unit > 0 ? expectancy / unit : null,
    rUnit: risk > 0 ? 'risk' : loss > 0 ? 'avg-loss' : null,
  };
}

export type Direction = 'long' | 'short';

export type RMultipleOutcome =
  | { status: 'ok'; r: number; riskPerUnit: number; resultPerUnit: number }
  | { status: 'undefined'; reason: 'zero-stop' }
  | { status: 'error'; error: 'stop-wrong-side' | 'not-a-number' };

/**
 * (exit − entry) ÷ (entry − stop): one formula for both directions, because both brackets change sign on a short.
 * `direction` only checks that the stop sits on the losing side of the entry.
 */
export function rMultiple(direction: Direction, entry: number, stop: number, exit: number): RMultipleOutcome {
  if (![entry, stop, exit].every(Number.isFinite)) return { status: 'error', error: 'not-a-number' };
  if (entry === stop) return { status: 'undefined', reason: 'zero-stop' };
  if (direction === 'long' ? stop > entry : stop < entry) return { status: 'error', error: 'stop-wrong-side' };
  const riskPerUnit = Math.abs(entry - stop);
  const resultPerUnit = direction === 'long' ? exit - entry : entry - exit;
  return { status: 'ok', r: resultPerUnit / riskPerUnit, riskPerUnit, resultPerUnit };
}

export interface WinRateInput {
  wins: number;
  losses: number;
  /** Trades that closed at exactly zero; 0 when not entered. */
  zero?: number;
  /** Average win ÷ average loss; 0 or omitted = no break-even win rate. */
  payoff?: number;
}

export type WinRateOutcome =
  | {
      status: 'ok';
      trades: number;
      /** Wins ÷ all trades, zero trades included. */
      winRatePct: number;
      /** Wins ÷ (wins + losses); null when every trade closed at zero. This is the figure the break-even rate compares with. */
      decisiveWinRatePct: number | null;
      breakEvenPct: number | null;
      /** decisiveWinRatePct − breakEvenPct, in percentage points. */
      marginPts: number | null;
    }
  | { status: 'error'; error: 'not-whole' | 'no-trades' | 'negative-payoff' | 'not-a-number' };

export function winRate({ wins, losses, zero = 0, payoff = 0 }: WinRateInput): WinRateOutcome {
  if (![wins, losses, zero, payoff].every(Number.isFinite)) return { status: 'error', error: 'not-a-number' };
  if (![wins, losses, zero].every((n) => Number.isInteger(n) && n >= 0)) return { status: 'error', error: 'not-whole' };
  if (payoff < 0) return { status: 'error', error: 'negative-payoff' };
  const trades = wins + losses + zero;
  if (trades === 0) return { status: 'error', error: 'no-trades' };
  const decisive = wins + losses;
  const decisiveWinRatePct = decisive > 0 ? (wins / decisive) * 100 : null;
  const breakEvenPct = breakEvenForRatioPct(payoff);
  return {
    status: 'ok',
    trades,
    winRatePct: (wins / trades) * 100,
    decisiveWinRatePct,
    breakEvenPct,
    marginPts: decisiveWinRatePct !== null && breakEvenPct !== null ? decisiveWinRatePct - breakEvenPct : null,
  };
}

export type SeriesKind = 'balances' | 'returns';

export type ParsedSeries = { status: 'ok'; values: number[] } | { status: 'error'; token: string };

/**
 * Reads a typed list: values separated by spaces, new lines or semicolons. Commas inside a value are thousands
 * separators (10,000 and 1,10,000 are one number each), so "100,105" is one value, not two. A leading "+", a true
 * minus sign (−), a trailing "%" and a currency symbol are accepted. Any other token is returned as the error.
 */
export function parseSeries(text: string): ParsedSeries {
  const values: number[] = [];
  for (const raw of text.split(/[\s;]+/).filter(Boolean)) {
    const cleaned = raw.replace(/,/g, '').replace(/−/g, '-').replace(/^[$₹€£]|%$/g, '').replace(/^([+-])[$₹€£]/, '$1');
    const n = cleaned === '' ? NaN : Number(cleaned);
    if (!Number.isFinite(n)) return { status: 'error', token: raw };
    values.push(n);
  }
  return { status: 'ok', values };
}

/** Indexes point into `levels`: for balances the list as entered, for returns a series that starts at 100 before the first return. */
export interface DrawdownEpisode {
  peakIndex: number;
  troughIndex: number;
  peak: number;
  trough: number;
  /** peak − trough, in the units of the series. */
  amount: number;
  /** amount ÷ peak × 100. */
  pct: number;
}

export type DrawdownError = 'too-few' | 'non-positive-start' | 'negative-balance' | 'return-below-minus-100';

export type DrawdownOutcome =
  | {
      status: 'ok';
      levels: number[];
      /** The largest fall as a share of its peak; null when the series never falls below a peak. */
      maxByPct: DrawdownEpisode | null;
      /** The largest fall in units; can be a different stretch from maxByPct when a later peak is higher. */
      maxByAmount: DrawdownEpisode | null;
      /** First index after the trough of maxByPct where the series is back at or above its peak; null = not recovered. */
      recoveredAt: number | null;
      /** Gain from the trough of maxByPct back to its peak, percent. Infinity when the trough is 0. */
      recoveryGainPct: number | null;
    }
  | { status: 'error'; error: DrawdownError };

export const RETURNS_START = 100;

export function maxDrawdown(series: number[], kind: SeriesKind): DrawdownOutcome {
  let levels: number[];
  if (kind === 'returns') {
    if (series.length < 1) return { status: 'error', error: 'too-few' };
    if (series.some((r) => r < -100)) return { status: 'error', error: 'return-below-minus-100' };
    levels = [RETURNS_START];
    for (const r of series) levels.push(levels[levels.length - 1] * (1 + r / 100));
  } else {
    if (series.length < 2) return { status: 'error', error: 'too-few' };
    if (series[0] <= 0) return { status: 'error', error: 'non-positive-start' };
    if (series.some((v) => v < 0)) return { status: 'error', error: 'negative-balance' };
    levels = series;
  }

  let peakIndex = 0;
  let maxByPct: DrawdownEpisode | null = null;
  let maxByAmount: DrawdownEpisode | null = null;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] >= levels[peakIndex]) {
      peakIndex = i;
      continue;
    }
    const peak = levels[peakIndex];
    const amount = peak - levels[i];
    const episode: DrawdownEpisode = { peakIndex, troughIndex: i, peak, trough: levels[i], amount, pct: (amount / peak) * 100 };
    if (!maxByPct || episode.pct > maxByPct.pct) maxByPct = episode;
    if (!maxByAmount || episode.amount > maxByAmount.amount) maxByAmount = episode;
  }

  let recoveredAt: number | null = null;
  if (maxByPct) {
    const { troughIndex, peak, trough } = maxByPct;
    const back = levels.findIndex((v, i) => i > troughIndex && v >= peak);
    recoveredAt = back === -1 ? null : back;
    return { status: 'ok', levels, maxByPct, maxByAmount, recoveredAt, recoveryGainPct: trough > 0 ? (peak / trough - 1) * 100 : Infinity };
  }
  return { status: 'ok', levels, maxByPct, maxByAmount, recoveredAt, recoveryGainPct: null };
}
