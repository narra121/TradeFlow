import { describe, expect, it } from 'vitest';
import { RATIO_TABLE, breakEvenAtRatioPct, resultPerTradeR, riskReward } from '../riskReward';

function ok(input: Parameters<typeof riskReward>[0]) {
  const r = riskReward(input);
  if (r.status !== 'ok') throw new Error(`expected ok, got stop ${r.stopWrongSide} target ${r.targetWrongSide}`);
  return r;
}

describe('riskReward', () => {
  it('long: entry 100, stop 95, target 115 risks 5 to make 15, 1 : 3, break-even 25%', () => {
    const r = ok({ direction: 'long', entry: 100, stop: 95, target: 115 });
    expect(r.risk).toBe(5);
    expect(r.reward).toBe(15);
    expect(r.ratio).toBe(3);
    expect(r.breakEvenPct).toBeCloseTo(25, 10);
  });

  it('long EUR/USD worked example: 1.0850, stop 1.0825, target 1.0910 is 1 : 2.4, break-even 29.4%', () => {
    const r = ok({ direction: 'long', entry: 1.085, stop: 1.0825, target: 1.091 });
    expect(r.risk).toBeCloseTo(0.0025, 12);
    expect(r.reward).toBeCloseTo(0.006, 12);
    expect(r.ratio).toBeCloseTo(2.4, 10);
    expect(r.breakEvenPct.toFixed(1)).toBe('29.4');
  });

  it('short: stop above and target below the entry; Nifty 24,500, stop 24,580, target 24,340 is 1 : 2', () => {
    const r = ok({ direction: 'short', entry: 24500, stop: 24580, target: 24340 });
    expect(r.risk).toBe(80);
    expect(r.reward).toBe(160);
    expect(r.ratio).toBe(2);
    expect(r.breakEvenPct).toBeCloseTo(100 / 3, 10);
  });

  it('a zero stop distance is an error on the stop only', () => {
    expect(riskReward({ direction: 'long', entry: 100, stop: 100, target: 110 })).toEqual({ status: 'error', stopWrongSide: true, targetWrongSide: false });
    expect(riskReward({ direction: 'short', entry: 100, stop: 100, target: 90 })).toEqual({ status: 'error', stopWrongSide: true, targetWrongSide: false });
  });

  it('an inverted stop or target is flagged on its own side', () => {
    expect(riskReward({ direction: 'long', entry: 100, stop: 105, target: 110 })).toEqual({ status: 'error', stopWrongSide: true, targetWrongSide: false });
    expect(riskReward({ direction: 'long', entry: 100, stop: 95, target: 90 })).toEqual({ status: 'error', stopWrongSide: false, targetWrongSide: true });
    expect(riskReward({ direction: 'short', entry: 1.265, stop: 1.26, target: 1.25 })).toEqual({ status: 'error', stopWrongSide: true, targetWrongSide: false });
    // Long prices entered with the short toggle: both levels are on the wrong side.
    expect(riskReward({ direction: 'short', entry: 100, stop: 95, target: 115 })).toEqual({ status: 'error', stopWrongSide: true, targetWrongSide: true });
  });
});

describe('break-even win rate', () => {
  it('is 1 ÷ (1 + ratio) across the table, from 66.7% at 1 : 0.5 to 16.7% at 1 : 5', () => {
    expect([...RATIO_TABLE]).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
    const pct = RATIO_TABLE.map((rr) => Number(breakEvenAtRatioPct(rr).toFixed(1)));
    expect(pct).toEqual([66.7, 50, 40, 33.3, 28.6, 25, 20, 16.7]);
  });

  it('costs in R raise it: 0.1R a trade moves 1 : 2 from 33.3% to 36.7%', () => {
    expect(breakEvenAtRatioPct(2, 0.1)).toBeCloseTo(110 / 3, 10);
    expect(breakEvenAtRatioPct(1, 0.1)).toBeCloseTo(55, 10);
  });

  it('is NaN for a ratio of 0 or below', () => {
    expect(breakEvenAtRatioPct(0)).toBeNaN();
    expect(breakEvenAtRatioPct(-1)).toBeNaN();
  });
});

describe('resultPerTradeR', () => {
  it('is win rate × ratio − loss rate: 40% at 1 : 2 is +0.2R, 30% at 1 : 2 is −0.1R', () => {
    expect(resultPerTradeR(2, 40)).toBeCloseTo(0.2, 12);
    expect(resultPerTradeR(2, 30)).toBeCloseTo(-0.1, 12);
    expect(resultPerTradeR(0.5, 50)).toBeCloseTo(-0.25, 12);
  });

  it('is zero at the break-even win rate for every ratio in the table', () => {
    for (const rr of RATIO_TABLE) expect(resultPerTradeR(rr, breakEvenAtRatioPct(rr)), String(rr)).toBeCloseTo(0, 12);
  });
});
