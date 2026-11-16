import { describe, expect, it } from 'vitest';
import { BREAK_EVEN_RATIOS, breakEvenForRatioPct, breakEvenWinRatePct, computeExpectancy, type ExpectancyResult } from '../expectancy';

function ok(input: Parameters<typeof computeExpectancy>[0]): ExpectancyResult {
  const r = computeExpectancy(input);
  if (r.status !== 'ok') throw new Error(`expected ok, got ${r.error}`);
  return r;
}

describe('computeExpectancy', () => {
  it('forex example: 45% at +150 / −100 with 3.50 charges is +9.00 a trade, +0.09R, break-even 41.4%', () => {
    const r = ok({ winRatePct: 45, avgWin: 150, avgLoss: 100, charges: 3.5 });
    expect(r.grossExpectancy).toBeCloseTo(12.5, 10);
    expect(r.expectancy).toBeCloseTo(9, 10);
    expect(r.expectancyR).toBeCloseTo(0.09, 10);
    expect(r.rewardRisk).toBeCloseTo(1.5, 10);
    expect(r.breakEvenGrossPct).toBeCloseTo(40, 10);
    expect(r.breakEvenPct).toBeCloseTo(41.4, 10);
    expect(r.profitFactor).toBeCloseTo((0.45 * 146.5) / (0.55 * 103.5), 10);
  });

  it('F&O example: positive before charges, negative after (40% at ₹1,300 / ₹780, ₹90 charges)', () => {
    const r = ok({ winRatePct: 40, avgWin: 1300, avgLoss: 780, charges: 90 });
    expect(r.grossExpectancy).toBeCloseTo(52, 10);
    expect(r.expectancy).toBeCloseTo(-38, 10);
    expect(r.expectancyR).toBeCloseTo(-38 / 780, 10);
    expect(r.breakEvenGrossPct).toBeCloseTo(37.5, 10);
    expect(r.breakEvenPct).toBeCloseTo((870 / 2080) * 100, 10);
  });

  it('R mode is the same maths with the loss as 1R: 35% at 3R is +0.4R', () => {
    const r = ok({ winRatePct: 35, avgWin: 3, avgLoss: 1 });
    expect(r.expectancy).toBeCloseTo(0.4, 10);
    expect(r.expectancyR).toBeCloseTo(0.4, 10);
    expect(r.breakEvenPct).toBeCloseTo(25, 10);
  });

  it('expectancy is zero exactly at the break-even win rate', () => {
    const be = ok({ winRatePct: 50, avgWin: 220, avgLoss: 130, charges: 7 }).breakEvenPct!;
    expect(ok({ winRatePct: be, avgWin: 220, avgLoss: 130, charges: 7 }).expectancy).toBeCloseTo(0, 9);
  });

  it('ignores the sign of the average loss', () => {
    expect(ok({ winRatePct: 45, avgWin: 150, avgLoss: -100 })).toEqual(ok({ winRatePct: 45, avgWin: 150, avgLoss: 100 }));
  });

  it('0% win rate: every trade is a loss plus charges; profit factor 0', () => {
    const r = ok({ winRatePct: 0, avgWin: 150, avgLoss: 100, charges: 2 });
    expect(r.expectancy).toBeCloseTo(-102, 10);
    expect(r.profitFactor).toBe(0);
  });

  it('100% win rate: expectancy is the net win; profit factor infinite; break-even still reported', () => {
    const r = ok({ winRatePct: 100, avgWin: 150, avgLoss: 100, charges: 2 });
    expect(r.expectancy).toBeCloseTo(148, 10);
    expect(r.profitFactor).toBe(Infinity);
    expect(r.breakEvenPct).toBeCloseTo(40.8, 10);
  });

  it('zero average loss: no R unit, no reward:risk; break-even is charges ÷ win', () => {
    const r = ok({ winRatePct: 60, avgWin: 50, avgLoss: 0, charges: 5 });
    expect(r.expectancy).toBeCloseTo(25, 10);
    expect(r.expectancyR).toBeNull();
    expect(r.rewardRisk).toBeNull();
    expect(r.breakEvenPct).toBeCloseTo(10, 10);
    expect(r.breakEvenGrossPct).toBe(0);
  });

  it('zero win and zero loss: break-even is undefined', () => {
    const r = ok({ winRatePct: 50, avgWin: 0, avgLoss: 0 });
    expect(r.expectancy).toBe(0);
    expect(r.breakEvenPct).toBeNull();
    expect(r.profitFactor).toBeNull();
  });

  it('charges larger than the average win: break-even above 100% and no profit factor', () => {
    const r = ok({ winRatePct: 70, avgWin: 4, avgLoss: 10, charges: 5 });
    expect(r.breakEvenPct).toBeGreaterThan(100);
    expect(r.profitFactor).toBeNull();
    expect(r.expectancy).toBeLessThan(0);
  });

  it('rejects a win rate outside 0 to 100, negative wins or charges and non-numbers', () => {
    expect(computeExpectancy({ winRatePct: 101, avgWin: 1, avgLoss: 1 })).toEqual({ status: 'error', error: 'win-rate-range' });
    expect(computeExpectancy({ winRatePct: -1, avgWin: 1, avgLoss: 1 })).toEqual({ status: 'error', error: 'win-rate-range' });
    expect(computeExpectancy({ winRatePct: 50, avgWin: -1, avgLoss: 1 })).toEqual({ status: 'error', error: 'negative-win' });
    expect(computeExpectancy({ winRatePct: 50, avgWin: 1, avgLoss: 1, charges: -1 })).toEqual({ status: 'error', error: 'negative-charges' });
    expect(computeExpectancy({ winRatePct: Number.NaN, avgWin: 1, avgLoss: 1 })).toEqual({ status: 'error', error: 'not-a-number' });
  });
});

describe('break-even helpers', () => {
  it('1:1 needs 50%, 1:2 needs 33.3%, 1:3 needs 25% before charges', () => {
    expect(breakEvenForRatioPct(1)).toBeCloseTo(50, 10);
    expect(breakEvenForRatioPct(2)).toBeCloseTo(100 / 3, 10);
    expect(breakEvenForRatioPct(3)).toBeCloseTo(25, 10);
  });

  it('charges in R raise the bar: 1:2 with 0.05R charges needs 35%', () => {
    expect(breakEvenForRatioPct(2, 0.05)).toBeCloseTo(35, 10);
  });

  it('agrees with the money form when the win is ratio × loss', () => {
    for (const rr of BREAK_EVEN_RATIOS) expect(breakEvenForRatioPct(rr, 3 / 80)).toBeCloseTo(breakEvenWinRatePct(rr * 80, 80, 3)!, 10);
  });

  it('returns null for a ratio of zero or below', () => {
    expect(breakEvenForRatioPct(0)).toBeNull();
    expect(breakEvenForRatioPct(-1)).toBeNull();
  });
});
