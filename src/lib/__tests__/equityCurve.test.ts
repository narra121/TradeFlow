import { describe, expect, it } from 'vitest';
import {
  MAX_RUNS,
  MAX_TRADES,
  SAMPLE_PATHS,
  expectancyR,
  expectedFinal,
  percentile,
  seededRandom,
  simulateEquity,
  type EquityInput,
  type EquityResult,
} from '../equityCurve';

const BASE: EquityInput = {
  startBalance: 10000,
  winRatePct: 45,
  avgWinR: 2,
  avgLossR: 1,
  sizing: 'percent',
  riskPct: 1,
  riskAmount: 100,
  costPerTrade: 0,
  trades: 100,
  runs: 1000,
  drawdownPct: 10,
  seed: 20261121,
};

const ok = (i: Partial<EquityInput>, pathCount?: number): EquityResult => {
  const r = simulateEquity({ ...BASE, ...i }, pathCount);
  if (r.status !== 'ok') throw new Error(r.error);
  return r;
};

/** |sample mean − expected| within four standard errors of the sample itself. */
function expectMeanNear(r: EquityResult, expected: number) {
  const finals = r.runs.map((s) => s.final);
  const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
  const sd = Math.sqrt(finals.reduce((a, b) => a + (b - mean) ** 2, 0) / (finals.length - 1));
  expect(Math.abs(mean - expected)).toBeLessThan((4 * sd) / Math.sqrt(finals.length));
}

describe('seeded generator', () => {
  it('repeats its sequence for a seed and stays in [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(Array.from({ length: 1000 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(seededRandom(8)()).not.toBe(xs[0]);
  });
});

describe('percentile', () => {
  it('is nearest-rank: the value at rank ⌈q·n⌉ of the sorted list', () => {
    const xs = Array.from({ length: 20 }, (_, k) => k + 1);
    expect(percentile(xs, 0.05)).toBe(1);
    expect(percentile(xs, 0.25)).toBe(5);
    expect(percentile(xs, 0.5)).toBe(10);
    expect(percentile(xs, 0.95)).toBe(19);
    expect(percentile(xs, 1)).toBe(20);
    expect(percentile([42], 0.05)).toBe(42);
  });
});

describe('determinism', () => {
  it('same inputs and seed give the same result; another seed gives another', () => {
    expect(simulateEquity(BASE)).toEqual(simulateEquity(BASE));
    const a = ok({});
    const b = ok({ seed: 1 });
    expect(b.runs.map((s) => s.final)).not.toEqual(a.runs.map((s) => s.final));
  });

  it('a seed gives both sizing models the same wins and losses, even when some fixed-amount runs reach 0', () => {
    const fixed = ok({ sizing: 'amount', riskAmount: 1000 });
    const percent = ok({ riskPct: 10 });
    expect(fixed.zeroShare).toBeGreaterThan(0);
    expect(percent.zeroShare).toBe(0);
    const alive = fixed.runs.map((s, k) => [s, percent.runs[k]] as const).filter(([s]) => s.final > 0);
    expect(alive.length).toBeLessThan(fixed.runs.length);
    for (const [a, b] of alive) expect(a.longestLosingStreak).toBe(b.longestLosingStreak);
  });

  it('defaults: 1,000 runs of 100 trades at 1% give a median of 14,026 and 20.5% reaching a 10% drawdown', () => {
    const r = ok({});
    expect(Math.round(r.final.p50)).toBe(14026);
    expect(Math.round(r.final.p5)).toBe(10722);
    expect(Math.round(r.final.p95)).toBe(17810);
    expect(r.belowStartShare).toBe(0.013);
    expect(r.drawdownHitShare).toBe(0.205);
    expect(r.losingStreak.p50).toBe(7);
  });
});

describe('closed-form checks', () => {
  it('expectancy per trade: 0.45 × 2 − 0.55 × 1 = +0.35R, less cost ÷ risk', () => {
    expect(expectancyR(BASE)).toBeCloseTo(0.35, 12);
    expect(expectancyR({ ...BASE, costPerTrade: 10 })).toBeCloseTo(0.25, 12);
    expect(expectancyR({ ...BASE, sizing: 'amount', riskAmount: 2000, winRatePct: 40, avgWinR: 1.8, costPerTrade: 80 })).toBeCloseTo(0.08, 12);
  });

  it('percent of current balance: the median run with k wins ends at B₀ × (1 + fW)^k × (1 − fL)^(n − k)', () => {
    const r = ok({});
    const k = Math.round(Math.log(r.final.p50 / 10000 / 0.99 ** 100) / Math.log(1.02 / 0.99));
    expect(k).toBe(45);
    expect(r.final.p50).toBeCloseTo(10000 * 1.02 ** 45 * 0.99 ** 55, 6);
    expect(expectedFinal(BASE)).toBeCloseTo(10000 * 1.0035 ** 100, 6);
  });

  it('the figures the page prints: an average of 14,182 and win-rate ranges of ±9.9, ±14 and ±7 points', () => {
    expect(Math.round(expectedFinal(BASE))).toBe(14182);
    const range = (n: number) => 2 * Math.sqrt((0.45 * 0.55) / n) * 100;
    expect(range(100).toFixed(1)).toBe('9.9');
    expect(Math.round(range(50))).toBe(14);
    expect(Math.round(range(200))).toBe(7);
  });

  it('fixed amount: the mean final balance is B₀ + n × (risk × E − c)', () => {
    const i: Partial<EquityInput> = { startBalance: 100000, sizing: 'amount', riskAmount: 100, costPerTrade: 5, trades: 200, runs: 2000 };
    expect(expectedFinal({ ...BASE, ...i })).toBeCloseTo(100000 + 200 * (100 * 0.35 - 5), 6);
    const r = ok(i);
    expect(r.zeroShare).toBe(0);
    expectMeanNear(r, 106000);
  });

  it('percent of current balance with a cost: the mean follows m′ = m × (1 + f × E) − c', () => {
    const i: EquityInput = { ...BASE, costPerTrade: 2, runs: 2000 };
    let m = i.startBalance;
    for (let t = 0; t < i.trades; t++) m = m * (1 + 0.01 * 0.35) - 2;
    expect(expectedFinal(i)).toBeCloseTo(m, 6);
    expectMeanNear(ok(i), m);
  });

  it('zero edge (50% at 1:1, fixed amount): the mean stays at the start and runs end below it (1 − P(k = n/2)) ÷ 2 of the time', () => {
    const i: Partial<EquityInput> = { winRatePct: 50, avgWinR: 1, avgLossR: 1, sizing: 'amount', riskAmount: 100, runs: 2000 };
    expect(expectancyR({ ...BASE, ...i })).toBe(0);
    expect(expectedFinal({ ...BASE, ...i })).toBe(10000);
    const r = ok(i);
    expectMeanNear(r, 10000);
    let c = 1;
    for (let k = 1; k <= 50; k++) c = (c * (100 - k + 1)) / k;
    const expected = (1 - c / 2 ** 100) / 2;
    expect(Math.abs(r.belowStartShare - expected)).toBeLessThan(4 * Math.sqrt((expected * (1 - expected)) / 2000));
  });
});

describe('edge cases with exact answers', () => {
  it('0% wins, fixed amount: every run loses n × risk, the streak is n, and a 10% drawdown after 10 losses of 1% counts', () => {
    const r = ok({ winRatePct: 0, sizing: 'amount', riskAmount: 100, trades: 10, runs: 50 });
    for (const s of r.runs) expect(s).toEqual({ final: 9000, maxDrawdown: 0.1, longestLosingStreak: 10 });
    expect(r.drawdownHitShare).toBe(1);
    expect(r.belowStartShare).toBe(1);
  });

  it('0% wins, percent of current balance: B₀ × (1 − f × L)^n', () => {
    const r = ok({ winRatePct: 0, trades: 50, runs: 5 });
    expect(r.final.p50).toBeCloseTo(10000 * 0.99 ** 50, 6);
    expect(r.maxDrawdown.p50).toBeCloseTo(1 - 0.99 ** 50, 12);
  });

  it('100% wins: no drawdown, no losing streak, B₀ + n × W × risk or B₀ × (1 + f × W)^n', () => {
    const fixed = ok({ winRatePct: 100, sizing: 'amount', riskAmount: 100, trades: 30, runs: 5 });
    expect(fixed.final.p50).toBe(10000 + 30 * 200);
    expect(fixed.maxDrawdown.p95).toBe(0);
    expect(fixed.losingStreak.p95).toBe(0);
    expect(ok({ winRatePct: 100, trades: 30, runs: 5 }).final.p50).toBeCloseTo(10000 * 1.02 ** 30, 6);
  });

  it('a balance that reaches 0 stays there for the rest of the path, so later percentiles still count every run', () => {
    const r = ok({ startBalance: 1000, winRatePct: 0, sizing: 'amount', riskAmount: 600, trades: 5, runs: 3 });
    expect(r.paths[0]).toEqual([1000, 400, 0, 0, 0, 0]);
    expect(r.zeroShare).toBe(1);
    expect(r.maxDrawdown.p50).toBe(1);
    expect(r.band.map((b) => b.p50)).toEqual([1000, 400, 0, 0, 0, 0]);
  });
});

describe('paths, band and per-run figures agree', () => {
  it('each sample path carries its run\'s final balance, peak-to-trough drawdown and losing streak', () => {
    const r = ok({ sizing: 'amount', riskAmount: 150 });
    expect(r.paths).toHaveLength(SAMPLE_PATHS);
    r.paths.forEach((p, k) => {
      expect(p).toHaveLength(101);
      let peak = p[0];
      let dd = 0;
      let streak = 0;
      let longest = 0;
      for (let t = 1; t < p.length; t++) {
        peak = Math.max(peak, p[t]);
        dd = Math.max(dd, (peak - p[t]) / peak);
        streak = p[t] < p[t - 1] ? streak + 1 : 0;
        longest = Math.max(longest, streak);
      }
      expect(r.runs[k].final).toBe(p[100]);
      expect(r.runs[k].maxDrawdown).toBeCloseTo(dd, 12);
      expect(r.runs[k].longestLosingStreak).toBe(longest);
    });
  });

  it('the band starts at the balance, keeps 5th ≤ median ≤ 95th and ends on the final-balance percentiles', () => {
    const r = ok({});
    expect(r.band[0]).toEqual({ trade: 0, p5: 10000, p50: 10000, p95: 10000 });
    for (const b of r.band) {
      expect(b.p5).toBeLessThanOrEqual(b.p50);
      expect(b.p50).toBeLessThanOrEqual(b.p95);
    }
    const last = r.band[r.band.length - 1];
    expect(last).toEqual({ trade: 100, p5: r.final.p5, p50: r.final.p50, p95: r.final.p95 });
  });

  it('a long run is banded at 201 evenly spaced trades; the limits are accepted', () => {
    const r = ok({ trades: MAX_TRADES, runs: MAX_RUNS });
    expect(r.band).toHaveLength(201);
    expect(r.band[1].trade).toBe(5);
    expect(r.band[200].trade).toBe(MAX_TRADES);
    expect(r.runs).toHaveLength(MAX_RUNS);
    expect(r.paths[0]).toHaveLength(MAX_TRADES + 1);
  });
});

describe('input bounds', () => {
  const error = (i: Partial<EquityInput>) => {
    const r = simulateEquity({ ...BASE, ...i });
    return r.status === 'error' ? r.error : null;
  };

  it('names the field that is out of range', () => {
    expect(error({ startBalance: 0 })).toBe('start');
    expect(error({ winRatePct: -1 })).toBe('win-rate');
    expect(error({ winRatePct: 101 })).toBe('win-rate');
    expect(error({ avgWinR: 0 })).toBe('avg-win');
    expect(error({ avgLossR: 0 })).toBe('avg-loss');
    expect(error({ riskPct: 0 })).toBe('risk');
    expect(error({ riskPct: 100 })).toBe('risk');
    expect(error({ sizing: 'amount', riskAmount: 0 })).toBe('risk');
    expect(error({ costPerTrade: -1 })).toBe('cost');
    expect(error({ trades: 0 })).toBe('trades');
    expect(error({ trades: MAX_TRADES + 1 })).toBe('trades');
    expect(error({ trades: 10.5 })).toBe('trades');
    expect(error({ runs: 0 })).toBe('runs');
    expect(error({ runs: MAX_RUNS + 1 })).toBe('runs');
    expect(error({ drawdownPct: 0 })).toBe('drawdown');
    expect(error({ drawdownPct: 100 })).toBe('drawdown');
    expect(error({ seed: -1 })).toBe('seed');
    expect(error({ seed: 2 ** 32 })).toBe('seed');
  });

  it('stops with too-large when a balance leaves the range of a double, and accepts a huge finite one', () => {
    expect(error({ winRatePct: 100, riskPct: 99, trades: MAX_TRADES, runs: 1 })).toBe('too-large');
    expect(error({ winRatePct: 100, riskPct: 50, trades: MAX_TRADES, runs: 1 })).toBeNull();
  });

  it('reads only the risk field of the chosen model', () => {
    expect(error({ sizing: 'amount', riskPct: 0 })).toBeNull();
    expect(error({ sizing: 'percent', riskAmount: 0 })).toBeNull();
    expect(error({ winRatePct: 0 })).toBeNull();
    expect(error({ winRatePct: 100 })).toBeNull();
  });
});
