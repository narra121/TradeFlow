import { describe, expect, it } from 'vitest';
import { forexSize, priceSize, riskBudget, type ForexInput, type ForexResult, type PriceInput, type PriceResult } from '../positionSize';
import { contractSizeOf, getPair, pipValue } from '@/content/forexPairs';

const eurUsd = getPair('EUR/USD');
const gold = getPair('XAU/USD');
const perLotUsd = (pair: typeof eurUsd) => pipValue(pair, contractSizeOf(pair), 'USD').inAccount;

const fx = (i: Partial<ForexInput>): ForexResult => {
  const r = forexSize({ capital: 10000, basis: 'percent', risk: 1, stopPips: 50, pipValuePerLot: perLotUsd(eurUsd), contractSize: 100000, ...i });
  if (r.status !== 'ok') throw new Error(r.error);
  return r;
};

const shares: PriceInput = { capital: 500000, basis: 'percent', risk: 1, direction: 'long', entry: 1240, stop: 1212, lotSize: 1 };
const px = (i: Partial<PriceInput>): PriceResult => {
  const r = priceSize({ ...shares, ...i });
  if (r.status !== 'ok') throw new Error(r.error);
  return r;
};
const pxError = (i: Partial<PriceInput>) => {
  const r = priceSize({ ...shares, ...i });
  return r.status === 'error' ? r.error : null;
};

describe('risk budget', () => {
  it('is a percent of capital or a fixed amount', () => {
    expect(riskBudget({ capital: 500000, basis: 'percent', risk: 1 })).toEqual({ status: 'ok', budget: 5000 });
    expect(riskBudget({ capital: 25000, basis: 'amount', risk: 200 })).toEqual({ status: 'ok', budget: 200 });
  });

  it('rejects no capital, no risk and a risk above the capital', () => {
    expect(riskBudget({ capital: 0, basis: 'percent', risk: 1 })).toEqual({ status: 'error', error: 'capital' });
    expect(riskBudget({ capital: 1000, basis: 'percent', risk: 0 })).toEqual({ status: 'error', error: 'risk' });
    expect(riskBudget({ capital: 1000, basis: 'percent', risk: 101 })).toEqual({ status: 'error', error: 'risk-over-capital' });
    expect(riskBudget({ capital: 1000, basis: 'amount', risk: 1000.01 })).toEqual({ status: 'error', error: 'risk-over-capital' });
    expect(riskBudget({ capital: Number.NaN, basis: 'amount', risk: 10 })).toEqual({ status: 'error', error: 'capital' });
  });
});

describe('forex lots', () => {
  it('$10,000 at 1% with a 50-pip EUR/USD stop is 0.20 lots, $100 at risk', () => {
    const r = fx({});
    expect(r.lots).toBe(0.2);
    expect(r.units).toBe(20000);
    expect(r.riskAtSize).toBeCloseTo(100, 9);
    expect(r.unused).toBeCloseTo(0, 9);
  });

  it('rounds down to 0.01 lot: a 30-pip stop gives 0.333, so 0.33 lots and $99 at risk', () => {
    const r = fx({ stopPips: 30 });
    expect(r.exactLots).toBeCloseTo(0.3333, 4);
    expect(r.lots).toBe(0.33);
    expect(r.units).toBe(33000);
    expect(r.riskAtSize).toBeCloseTo(99, 9);
    expect(r.unused).toBeCloseTo(1, 9);
  });

  it('gold: a fixed $120 at a 40-pip stop (0.10 a pip, 100 oz a lot) is 0.30 lots, 30 oz', () => {
    const r = fx({ capital: 5000, basis: 'amount', risk: 120, stopPips: 40, pipValuePerLot: perLotUsd(gold), contractSize: contractSizeOf(gold) });
    expect(r.lots).toBe(0.3);
    expect(r.units).toBe(30);
    expect(r.riskAtSize).toBeCloseTo(120, 9);
  });

  it('says so when even 0.01 lot loses more than the budget', () => {
    const r = fx({ capital: 500, risk: 1, stopPips: 100 });
    expect(r.lots).toBe(0);
    expect(r.belowMinimum).toBe(true);
    expect(r.minLotRisk).toBeCloseTo(10, 9);
    expect(r.unused).toBeCloseTo(5, 9);
  });

  it('a zero or negative stop is an error, after the budget checks', () => {
    expect(forexSize({ capital: 10000, basis: 'percent', risk: 1, stopPips: 0, pipValuePerLot: 10, contractSize: 100000 })).toEqual({ status: 'error', error: 'stop' });
    expect(forexSize({ capital: 10000, basis: 'percent', risk: 1, stopPips: -5, pipValuePerLot: 10, contractSize: 100000 })).toEqual({ status: 'error', error: 'stop' });
    expect(forexSize({ capital: 10000, basis: 'percent', risk: 0, stopPips: 0, pipValuePerLot: 10, contractSize: 100000 })).toEqual({ status: 'error', error: 'risk' });
  });
});

describe('shares', () => {
  it('₹5,00,000 at 1%, long at ₹1,240 with a stop at ₹1,212: 178 shares, ₹4,984 at risk', () => {
    const r = px({});
    expect(r.riskPerUnit).toBe(28);
    expect(r.exactLots).toBeCloseTo(178.571, 3);
    expect(r.lots).toBe(178);
    expect(r.quantity).toBe(178);
    expect(r.riskAtSize).toBe(4984);
    expect(r.unused).toBe(16);
    expect(r.positionValue).toBe(220720);
    expect(r.capitalShare).toBeCloseTo(0.44144, 5);
    expect(r.oneLotOverBudget).toBe(false);
  });

  it('a short with a fixed amount: $200 over a $1.60 stop is exactly 125 shares', () => {
    const r = px({ capital: 25000, basis: 'amount', risk: 200, direction: 'short', entry: 84.5, stop: 86.1 });
    expect(r.lots).toBe(125);
    expect(r.riskAtSize).toBeCloseTo(200, 9);
    expect(r.positionValue).toBeCloseTo(10562.5, 9);
  });

  it('does not lose a whole share to float error (300 ÷ 0.1)', () => {
    const r = px({ capital: 30000, risk: 1, entry: 10.3, stop: 10.2 });
    expect(r.riskPerUnit).toBeCloseTo(0.1, 12);
    expect(r.lots).toBe(3000);
  });

  it('one share above the budget gives 0 shares and says so', () => {
    const r = px({ capital: 100000, risk: 0.5, entry: 140000, stop: 139000 });
    expect(r.lots).toBe(0);
    expect(r.oneLotOverBudget).toBe(true);
    expect(r.riskPerLot).toBe(1000);
    expect(r.oneLotRiskShare).toBeCloseTo(0.01, 12);
    expect(r.unused).toBe(500);
  });

  it('shows a position that costs more than the capital', () => {
    const r = px({ capital: 100000, risk: 2, entry: 500, stop: 495 });
    expect(r.lots).toBe(400);
    expect(r.positionValue).toBe(200000);
    expect(r.capitalShare).toBe(2);
  });
});

describe('futures and options in whole lots', () => {
  it('futures: one lot of 500 at a ₹22 stop risks ₹11,000, over a ₹10,000 budget, so 0 lots', () => {
    const r = px({ capital: 1000000, risk: 1, direction: 'short', entry: 2480, stop: 2502, lotSize: 500 });
    expect(r.riskPerLot).toBe(11000);
    expect(r.lots).toBe(0);
    expect(r.oneLotOverBudget).toBe(true);
    expect(r.oneLotRiskShare).toBeCloseTo(0.011, 12);
    expect(r.unused).toBe(10000);
  });

  it('futures: at 1.5% one lot fits, ₹4,000 unused, contract worth ₹12,40,000', () => {
    const r = px({ capital: 1000000, risk: 1.5, direction: 'short', entry: 2480, stop: 2502, lotSize: 500 });
    expect(r.lots).toBe(1);
    expect(r.quantity).toBe(500);
    expect(r.riskAtSize).toBe(11000);
    expect(r.unused).toBe(4000);
    expect(r.positionValue).toBe(1240000);
  });

  it('options bought: ₹120 premium, stop ₹80, lot 100: ₹4,000 a lot, 1 lot of a ₹6,000 budget', () => {
    const r = px({ capital: 300000, risk: 2, direction: 'long', entry: 120, stop: 80, lotSize: 100 });
    expect(r.riskPerLot).toBe(4000);
    expect(r.lots).toBe(1);
    expect(r.quantity).toBe(100);
    expect(r.riskAtSize).toBe(4000);
    expect(r.unused).toBe(2000);
    expect(r.positionValue).toBe(12000);
    expect(r.capitalShare).toBeCloseTo(0.04, 12);
  });

  it('rounds down to whole lots', () => {
    const r = px({ capital: 1000000, risk: 1, entry: 300, stop: 290, lotSize: 300 });
    expect(r.exactLots).toBeCloseTo(3.333, 3);
    expect(r.lots).toBe(3);
    expect(r.quantity).toBe(900);
    expect(r.riskAtSize).toBe(9000);
    expect(r.unused).toBe(1000);
  });
});

describe('price errors', () => {
  it('zero, missing or inverted stops and bad entries are errors, checked in field order', () => {
    expect(pxError({ entry: 0 })).toBe('entry');
    expect(pxError({ stop: 0 })).toBe('stop');
    expect(pxError({ stop: Number.NaN })).toBe('stop');
    expect(pxError({ stop: 1240 })).toBe('stop-equal');
    expect(pxError({ direction: 'long', stop: 1250 })).toBe('stop-side');
    expect(pxError({ direction: 'short', stop: 1230 })).toBe('stop-side');
    expect(pxError({ lotSize: 0 })).toBe('lot-size');
    expect(pxError({ capital: 0, stop: 0 })).toBe('capital');
    expect(pxError({ risk: 0, entry: 0 })).toBe('risk');
  });
});
