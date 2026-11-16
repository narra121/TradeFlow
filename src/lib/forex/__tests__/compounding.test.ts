import { describe, expect, it } from 'vitest';
import { compound, requiredRatePct, yearlyEquivalentPct, type CompoundResult } from '../compounding';

const ok = (r: ReturnType<typeof compound>) => {
  if (r.status !== 'ok') throw new Error(r.error);
  return r as CompoundResult;
};

describe('compounding', () => {
  it('$10,000 at 2% a month for 12 months is $12,682.42', () => {
    const r = ok(compound({ start: 10000, ratePct: 2, periods: 12 }));
    expect(r.final).toBeCloseTo(10000 * 1.02 ** 12, 6);
    expect(r.final.toFixed(2)).toBe('12682.42');
    expect(r.totalGain).toBeCloseTo(2682.42, 2);
    expect(r.rows).toHaveLength(12);
    expect(r.rows[0]).toEqual({ period: 1, gain: 200, balance: 10200 });
  });

  it('adds a deposit at the end of each period, after that period\'s return', () => {
    const r = ok(compound({ start: 1000, ratePct: 10, periods: 2, deposit: 100 }));
    // 1000 → 1100 + 100 = 1200 → 1320 + 100 = 1420
    expect(r.rows.map((x) => x.balance)).toEqual([1200, 1420]);
    expect(r.deposits).toBe(200);
    expect(r.totalGain).toBeCloseTo(220, 9);
    expect(r.totalGainPct).toBeCloseTo((220 / 1200) * 100, 9);
  });

  it('handles losing periods', () => {
    expect(ok(compound({ start: 10000, ratePct: -1, periods: 10 })).final).toBeCloseTo(10000 * 0.99 ** 10, 6);
  });

  it('rejects impossible inputs', () => {
    expect(compound({ start: -1, ratePct: 1, periods: 10 })).toEqual({ status: 'error', error: 'start' });
    expect(compound({ start: 100, ratePct: -100, periods: 10 })).toEqual({ status: 'error', error: 'rate' });
    expect(compound({ start: 100, ratePct: 1, periods: 0 })).toEqual({ status: 'error', error: 'periods' });
    expect(compound({ start: 100, ratePct: 1, periods: 2.5 })).toEqual({ status: 'error', error: 'periods' });
    expect(compound({ start: 100, ratePct: 1, periods: 1001 })).toEqual({ status: 'error', error: 'periods' });
    expect(compound({ start: 100, ratePct: 1, periods: 10, deposit: -5 })).toEqual({ status: 'error', error: 'deposit' });
  });
});

describe('rates', () => {
  it('1% a day compounds to about 1,229% a year over 260 trading days', () => {
    expect(yearlyEquivalentPct(1, 'day')).toBeCloseTo((1.01 ** 260 - 1) * 100, 6);
    expect(Math.round(yearlyEquivalentPct(1, 'day'))).toBe(1229);
    expect(yearlyEquivalentPct(2, 'month')).toBeCloseTo(26.824, 3);
  });

  it('the rate needed to double in 12 months is 5.95% a month', () => {
    expect(requiredRatePct(10000, 20000, 12)!).toBeCloseTo(5.9463, 4);
    expect(requiredRatePct(0, 20000, 12)).toBeNull();
  });
});
