/**
 * Monte Carlo equity curves for the public simulator (/resources/equity-curve-simulator). Every trade is independent: it
 * wins `avgWinR` times the risk with probability p or loses `avgLossR` times the risk, then pays `costPerTrade`. A balance
 * that reaches 0 stays at 0 (the account is gone); drawdown is measured from the running peak, not from the start.
 */

export const MAX_TRADES = 1000;
export const MAX_RUNS = 2000;
/** Runs whose full path is returned for drawing. */
export const SAMPLE_PATHS = 20;
/** Most trade indices the band is computed at; longer runs are sampled evenly. */
const BAND_POINTS = 200;

/** `percent` = risk a share of the current balance; `amount` = risk the same money on every trade. */
export type Sizing = 'percent' | 'amount';

export interface EquityInput {
  startBalance: number;
  /** Percent, 0 to 100. */
  winRatePct: number;
  /** Average winner as a multiple of the risk (R), above 0. */
  avgWinR: number;
  /** Average loser as a multiple of the risk (R), above 0; 1 = the full planned risk. */
  avgLossR: number;
  sizing: Sizing;
  /** Read when `sizing` is `percent`: percent of the current balance, above 0 and below 100. */
  riskPct: number;
  /** Read when `sizing` is `amount`: money at risk on each trade, above 0. */
  riskAmount: number;
  /** Money paid on every trade, winners and losers; 0 or more. */
  costPerTrade: number;
  /** Whole number, 1 to MAX_TRADES. */
  trades: number;
  /** Whole number, 1 to MAX_RUNS. */
  runs: number;
  /** Drawdown from the peak that a run is counted for, percent, above 0 and below 100. */
  drawdownPct: number;
  /** Whole number, 0 to 2^32 − 1. */
  seed: number;
}

/** `too-large`: a run's balance left the range of a double (about 1.8 × 10³⁰⁸), so its figures cannot be computed. */
export type EquityError = 'start' | 'win-rate' | 'avg-win' | 'avg-loss' | 'risk' | 'cost' | 'trades' | 'runs' | 'drawdown' | 'seed' | 'too-large';

export interface RunStats {
  final: number;
  /** Largest fall from a running peak as a fraction of that peak, 0 to 1. */
  maxDrawdown: number;
  longestLosingStreak: number;
}

export interface Percentiles {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

/** Balance across runs after `trade` trades. */
export interface BandPoint {
  trade: number;
  p5: number;
  p50: number;
  p95: number;
}

export interface EquityResult {
  status: 'ok';
  runs: RunStats[];
  /** Balance after each trade (index 0 = the start) of the first runs, at most the `pathCount` asked for. */
  paths: number[][];
  band: BandPoint[];
  final: Percentiles;
  maxDrawdown: Percentiles;
  losingStreak: Percentiles;
  /** Shares of runs, 0 to 1. */
  belowStartShare: number;
  drawdownHitShare: number;
  zeroShare: number;
}

export type EquityOutcome = EquityResult | { status: 'error'; error: EquityError };

const whole = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
const positive = (n: number) => Number.isFinite(n) && n > 0;

function validate(i: EquityInput): EquityError | null {
  if (!positive(i.startBalance)) return 'start';
  if (!Number.isFinite(i.winRatePct) || i.winRatePct < 0 || i.winRatePct > 100) return 'win-rate';
  if (!positive(i.avgWinR)) return 'avg-win';
  if (!positive(i.avgLossR)) return 'avg-loss';
  if (i.sizing === 'percent' ? !(i.riskPct > 0 && i.riskPct < 100) : !positive(i.riskAmount)) return 'risk';
  if (!Number.isFinite(i.costPerTrade) || i.costPerTrade < 0) return 'cost';
  if (!whole(i.trades, 1, MAX_TRADES)) return 'trades';
  if (!whole(i.runs, 1, MAX_RUNS)) return 'runs';
  if (!(i.drawdownPct > 0 && i.drawdownPct < 100)) return 'drawdown';
  if (!whole(i.seed, 0, 0xffffffff)) return 'seed';
  return null;
}

/** Money at risk on the first trade. */
export function startingRisk(i: EquityInput): number {
  return i.sizing === 'amount' ? i.riskAmount : (i.riskPct / 100) * i.startBalance;
}

/** Expectancy per trade in R at the starting risk: p·W − (1 − p)·L − cost ÷ risk. */
export function expectancyR(i: EquityInput): number {
  const p = i.winRatePct / 100;
  return p * i.avgWinR - (1 - p) * i.avgLossR - i.costPerTrade / startingRisk(i);
}

/**
 * Mean final balance of the model, ignoring the floor at 0 (exact while no run can reach it). Fixed amount:
 * B₀ + n·(risk·E − c), E in R before costs. Percent of current: the mean grows by a = 1 + f·E a trade, so
 * Bₙ = aⁿ·B₀ − c·(aⁿ − 1) ÷ (a − 1).
 */
export function expectedFinal(i: EquityInput): number {
  const p = i.winRatePct / 100;
  const edge = p * i.avgWinR - (1 - p) * i.avgLossR;
  const n = i.trades;
  const c = i.costPerTrade;
  if (i.sizing === 'amount') return i.startBalance + n * (i.riskAmount * edge - c);
  const a = 1 + (i.riskPct / 100) * edge;
  if (a === 1) return i.startBalance - n * c;
  return a ** n * i.startBalance - (c * (a ** n - 1)) / (a - 1);
}

/** Deterministic numbers in [0, 1): mulberry32, the generator `simulateRuin` in lib/forex/riskOfRuin.ts uses. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nearest-rank percentile of an ascending array (the value at rank ⌈q·n⌉), so every figure is one run's actual result. */
export function percentile(sorted: ArrayLike<number>, q: number): number {
  return sorted[Math.max(0, Math.ceil(q * sorted.length - 1e-9) - 1)];
}

function summarize(values: number[]): Percentiles {
  const s = Float64Array.from(values).sort();
  return { p5: percentile(s, 0.05), p25: percentile(s, 0.25), p50: percentile(s, 0.5), p75: percentile(s, 0.75), p95: percentile(s, 0.95) };
}

function bandTrades(n: number): number[] {
  const count = Math.min(n, BAND_POINTS);
  return Array.from({ length: count + 1 }, (_, k) => Math.round((k * n) / count));
}

/** Plays one run into `path` (length trades + 1). */
function play(i: EquityInput, next: () => number, path: Float64Array): RunStats {
  const p = i.winRatePct / 100;
  const f = i.riskPct / 100;
  let balance = i.startBalance;
  let peak = balance;
  let maxDrawdown = 0;
  let streak = 0;
  let longest = 0;
  path[0] = balance;
  for (let t = 1; t <= i.trades; t++) {
    // Drawn even after the balance reaches 0, so run r gets the same wins and losses under either sizing model.
    const won = next() < p;
    if (balance > 0) {
      const risk = i.sizing === 'percent' ? f * balance : i.riskAmount;
      if (won) {
        balance += risk * i.avgWinR;
        streak = 0;
      } else {
        balance -= risk * i.avgLossR;
        streak++;
        if (streak > longest) longest = streak;
      }
      balance = Math.max(0, balance - i.costPerTrade);
      if (balance > peak) peak = balance;
      maxDrawdown = Math.max(maxDrawdown, (peak - balance) / peak);
    }
    path[t] = balance;
  }
  return { final: balance, maxDrawdown, longestLosingStreak: longest };
}

export function simulateEquity(i: EquityInput, pathCount = SAMPLE_PATHS): EquityOutcome {
  const error = validate(i);
  if (error) return { status: 'error', error };
  const next = seededRandom(i.seed);
  const path = new Float64Array(i.trades + 1);
  const at = bandTrades(i.trades);
  // Point k of run r sits at k·runs + r, so each point's values across runs are one contiguous block to sort.
  const grid = new Float64Array(at.length * i.runs);
  const runs: RunStats[] = [];
  const paths: number[][] = [];
  // Ten losses of 1% from 10,000 is a 10% drawdown that floating point can leave a hair short.
  const hitLevel = i.drawdownPct / 100 - 1e-12;
  const belowLevel = i.startBalance * (1 - 1e-9);
  let below = 0;
  let hit = 0;
  let zero = 0;
  for (let r = 0; r < i.runs; r++) {
    const s = play(i, next, path);
    // A balance that overflows to Infinity turns NaN on the next loss and stays there, so the final balance shows it.
    if (!Number.isFinite(s.final)) return { status: 'error', error: 'too-large' };
    runs.push(s);
    if (r < pathCount) paths.push(Array.from(path));
    for (let k = 0; k < at.length; k++) grid[k * i.runs + r] = path[at[k]];
    if (s.final < belowLevel) below++;
    if (s.maxDrawdown >= hitLevel) hit++;
    if (s.final === 0) zero++;
  }
  const band = at.map((trade, k) => {
    const values = grid.subarray(k * i.runs, (k + 1) * i.runs).sort();
    return { trade, p5: percentile(values, 0.05), p50: percentile(values, 0.5), p95: percentile(values, 0.95) };
  });
  return {
    status: 'ok',
    runs,
    paths,
    band,
    final: summarize(runs.map((s) => s.final)),
    maxDrawdown: summarize(runs.map((s) => s.maxDrawdown)),
    losingStreak: summarize(runs.map((s) => s.longestLosingStreak)),
    belowStartShare: below / i.runs,
    drawdownHitShare: hit / i.runs,
    zeroShare: zero / i.runs,
  };
}
