import { describe, expect, it } from 'vitest';
import { riskOfRuin, ruinRoot, simulateRuin, type RuinInput, type RuinResult } from '../riskOfRuin';

const ok = (i: RuinInput) => {
  const r = riskOfRuin(i);
  if (r.status !== 'ok') throw new Error(r.error);
  return r as RuinResult;
};

describe('ruin root', () => {
  it('matches the gambler\'s-ruin ratio q/p for even payoffs', () => {
    expect(ruinRoot(0.6, 1)).toBeCloseTo(0.4 / 0.6, 9);
  });

  it('solves 0.4r³ − r + 0.6 = 0 for a 1:2 payoff at 40%', () => {
    expect(ruinRoot(0.4, 2)).toBeCloseTo((-0.4 + Math.sqrt(0.16 + 0.96)) / 0.8, 9);
  });

  it('is 1 with no edge or a negative one, and 0 when nothing loses', () => {
    expect(ruinRoot(0.5, 1)).toBe(1);
    expect(ruinRoot(0.3, 2)).toBe(1);
    expect(ruinRoot(1, 1)).toBe(0);
  });
});

describe('risk of ruin', () => {
  it('fixed risk: 60% wins at 1:1, 1% risk, ruin at −5% = (2/3)^5 = 13.2%', () => {
    const r = ok({ winRatePct: 60, rewardRisk: 1, riskPct: 1, ruinPct: 5, model: 'fixed' });
    expect(r.probability).toBeCloseTo((2 / 3) ** 5, 9);
    expect(r.lossesInARow).toBe(5);
    expect(r.expectancyR).toBeCloseTo(0.2, 9);
  });

  it('fixed risk: 45% wins at 1:2, 1% risk, ruin at −10% is about 3.4%', () => {
    const r = ok({ winRatePct: 45, rewardRisk: 2, riskPct: 1, ruinPct: 10, model: 'fixed' });
    const root = (-0.45 + Math.sqrt(0.45 ** 2 + 4 * 0.45 * 0.55)) / 0.9;
    expect(r.probability).toBeCloseTo(root ** 10, 9);
    expect(r.probability).toBeCloseTo(0.0341, 3);
  });

  it('is certain without an edge', () => {
    expect(ok({ winRatePct: 50, rewardRisk: 1, riskPct: 2, ruinPct: 20, model: 'fixed' }).probability).toBe(1);
    expect(ok({ winRatePct: 30, rewardRisk: 2, riskPct: 2, ruinPct: 20, model: 'compounding' }).probability).toBe(1);
  });

  it('compounding risk needs more losses in a row to reach the same drawdown', () => {
    const fixed = ok({ winRatePct: 50, rewardRisk: 1.5, riskPct: 2, ruinPct: 20, model: 'fixed' });
    const comp = ok({ winRatePct: 50, rewardRisk: 1.5, riskPct: 2, ruinPct: 20, model: 'compounding' });
    expect(fixed.lossesInARow).toBe(10);
    expect(comp.lossesInARow).toBe(12); // 0.98^11 = 0.8007, 0.98^12 = 0.7847
  });

  it('rejects out-of-range inputs', () => {
    const i: RuinInput = { winRatePct: 50, rewardRisk: 1.5, riskPct: 1, ruinPct: 20, model: 'fixed' };
    expect(riskOfRuin({ ...i, winRatePct: 101 })).toEqual({ status: 'error', error: 'win-rate' });
    expect(riskOfRuin({ ...i, rewardRisk: 0 })).toEqual({ status: 'error', error: 'reward-risk' });
    expect(riskOfRuin({ ...i, riskPct: 0 })).toEqual({ status: 'error', error: 'risk' });
    expect(riskOfRuin({ ...i, ruinPct: 100 })).toEqual({ status: 'error', error: 'ruin' });
  });
});

describe('simulation', () => {
  it('agrees with the formula over a long horizon (whole-number payoff, fixed risk)', () => {
    const i: RuinInput = { winRatePct: 45, rewardRisk: 2, riskPct: 1, ruinPct: 10, model: 'fixed' };
    expect(Math.abs(simulateRuin(i, 1500, 8000)! - ok(i).probability)).toBeLessThan(0.01);
  });

  it('agrees with the log-space approximation for compounding risk', () => {
    const i: RuinInput = { winRatePct: 50, rewardRisk: 1.2, riskPct: 2, ruinPct: 20, model: 'compounding' };
    expect(Math.abs(simulateRuin(i, 2000, 6000)! - ok(i).probability)).toBeLessThan(0.03);
  });

  it('is repeatable, grows with the horizon, and is null on bad input', () => {
    const i: RuinInput = { winRatePct: 50, rewardRisk: 1.5, riskPct: 2, ruinPct: 20, model: 'fixed' };
    expect(simulateRuin(i, 100, 2000)).toBe(simulateRuin(i, 100, 2000));
    expect(simulateRuin(i, 20, 2000)!).toBeLessThan(simulateRuin(i, 500, 2000)!);
    expect(simulateRuin({ ...i, riskPct: 0 }, 100)).toBeNull();
  });
});
