/**
 * Risk of ruin for the public calculator (/resources/risk-of-ruin-calculator). "Ruin" is a drawdown of `ruinPct` from the
 * starting balance (a prop firm's maximum loss, or the point you would stop), not a zero balance.
 *
 * Every trade wins `rewardRisk` R with probability p or loses 1R. In units of one loss that is a random walk with steps
 * +x and −1; the chance of ever falling N units is r^N, where r is the root in (0, 1) of p·r^(x+1) − r + (1 − p) = 0
 * (exact for whole-number x, a close approximation otherwise). With risk as a share of the current balance the walk is
 * in log space: x = ln(1 + b·f) ÷ −ln(1 − f) and N = ln(1 − D) ÷ ln(1 − f).
 */

/** `fixed` = risk a set amount (a % of the starting balance); `compounding` = a % of the current balance. */
export type RiskModel = 'fixed' | 'compounding';

export interface RuinInput {
  /** Percent, 0 to 100. */
  winRatePct: number;
  /** Average win ÷ average loss (the R of a winner). */
  rewardRisk: number;
  /** Percent of the balance risked on each trade, above 0. */
  riskPct: number;
  /** Drawdown from the start that counts as ruin, percent, above 0 and below 100. */
  ruinPct: number;
  model: RiskModel;
}

export type RuinError = 'win-rate' | 'reward-risk' | 'risk' | 'ruin';

export interface RuinResult {
  status: 'ok';
  /** Chance of ever reaching the ruin level, 0 to 1. */
  probability: number;
  /** Losing trades in a row that reach it. */
  lossesInARow: number;
  /** Expectancy per trade in R: p·b − (1 − p). */
  expectancyR: number;
}

export type RuinOutcome = RuinResult | { status: 'error'; error: RuinError };

function validate(i: RuinInput): RuinError | null {
  if (!Number.isFinite(i.winRatePct) || i.winRatePct < 0 || i.winRatePct > 100) return 'win-rate';
  if (!(i.rewardRisk > 0)) return 'reward-risk';
  if (!(i.riskPct > 0) || i.riskPct >= 100) return 'risk';
  if (!(i.ruinPct > 0) || i.ruinPct >= 100) return 'ruin';
  return null;
}

/** Up-step x and distance N, both in units of one losing step. */
function walk(i: RuinInput): { x: number; n: number } {
  const f = i.riskPct / 100;
  const d = i.ruinPct / 100;
  if (i.model === 'fixed') return { x: i.rewardRisk, n: d / f };
  const down = -Math.log(1 - f);
  return { x: Math.log(1 + i.rewardRisk * f) / down, n: Math.log(1 - d) / Math.log(1 - f) };
}

/** Root in (0, 1) of p·r^(x+1) − r + q = 0; 1 when the walk has no upward drift (ruin is then certain). */
export function ruinRoot(p: number, x: number): number {
  const q = 1 - p;
  if (p <= 0) return 1;
  if (q <= 0) return 0;
  if (p * x - q <= 0) return 1;
  const g = (r: number) => p * r ** (x + 1) + q - r;
  let lo = 0;
  let hi = 1 - 1e-9;
  if (g(hi) >= 0) return 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function riskOfRuin(i: RuinInput): RuinOutcome {
  const error = validate(i);
  if (error) return { status: 'error', error };
  const p = i.winRatePct / 100;
  const { x, n } = walk(i);
  const r = ruinRoot(p, x);
  return {
    status: 'ok',
    probability: Math.min(1, r ** n),
    lossesInARow: Math.ceil(n - 1e-9),
    expectancyR: p * i.rewardRisk - (1 - p),
  };
}

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32), so a page shows the same simulation on every load. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Share of `runs` simulated accounts (starting at 1) that reach the ruin level within `trades` trades; null on bad input. */
export function simulateRuin(i: RuinInput, trades: number, runs = 5000, seed = 20261115): number | null {
  if (validate(i) || !(trades >= 1) || !(runs >= 1)) return null;
  const p = i.winRatePct / 100;
  const f = i.riskPct / 100;
  const floor = 1 - i.ruinPct / 100 + 1e-12;
  const next = random(seed);
  let ruined = 0;
  for (let run = 0; run < runs; run++) {
    let balance = 1;
    for (let t = 0; t < trades; t++) {
      const risk = i.model === 'fixed' ? f : f * balance;
      balance += next() < p ? risk * i.rewardRisk : -risk;
      if (balance <= floor) {
        ruined++;
        break;
      }
    }
  }
  return ruined / runs;
}
