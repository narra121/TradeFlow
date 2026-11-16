import { describe, expect, it } from 'vitest';
import { getPair, pipValue } from '@/content/forexPairs';
import { marginFor, type MarginResult } from '../margin';

const ok = (r: ReturnType<typeof marginFor>) => {
  if (r.status !== 'ok') throw new Error(r.error);
  return r as MarginResult;
};

describe('forex margin', () => {
  it('EUR/USD 1 lot at 1.0850 and 1:30 needs $3,616.67', () => {
    const r = ok(marginFor({ pair: getPair('EUR/USD'), price: 1.085, lots: 1, leverage: 30, account: 'USD', balance: 10000 }));
    expect(r.units).toBe(100000);
    expect(r.notional).toBeCloseTo(108500, 6);
    expect(r.margin).toBeCloseTo(3616.6667, 3);
    expect(r.marginPctOfBalance).toBeCloseTo(36.1667, 3);
    expect(r.maxLots).toBe(2.76);
    expect(r.effectiveLeverage).toBeCloseTo(10.85, 6);
  });

  it('USD/JPY: a USD-based pair needs units ÷ leverage in USD, whatever the price', () => {
    const r = ok(marginFor({ pair: getPair('USD/JPY'), price: 150, lots: 0.5, leverage: 100, account: 'USD' }));
    expect(r.margin).toBeCloseTo(500, 9);
    expect(r.marginPctOfBalance).toBeNull();
    expect(r.maxLots).toBeNull();
  });

  it('gold: 0.10 lot is 10 oz; at $4,200 and 1:100 the margin is $420', () => {
    const r = ok(marginFor({ pair: getPair('XAU/USD'), price: 4200, lots: 0.1, leverage: 100, account: 'USD' }));
    expect(r.units).toBeCloseTo(10, 9);
    expect(r.notional).toBeCloseTo(42000, 6);
    expect(r.margin).toBeCloseTo(420, 6);
  });

  it('converts to the account currency at the reference rate', () => {
    const r = ok(marginFor({ pair: getPair('GBP/USD'), price: 1.265, lots: 1, leverage: 50, account: 'EUR' }));
    expect(r.margin).toBeCloseTo((126500 / 50) / 1.085, 6);
  });

  it('crosses use the reference rate for the quote currency', () => {
    const r = ok(marginFor({ pair: getPair('GBP/JPY'), price: 196.7, lots: 1, leverage: 100, account: 'USD' }));
    expect(r.notional).toBeCloseTo((100000 * 196.7) / 155.5, 6);
  });

  it('rejects zero price, lots or leverage below 1:1', () => {
    const pair = getPair('EUR/USD');
    expect(marginFor({ pair, price: 0, lots: 1, leverage: 30, account: 'USD' })).toEqual({ status: 'error', error: 'price' });
    expect(marginFor({ pair, price: 1.1, lots: 0, leverage: 30, account: 'USD' })).toEqual({ status: 'error', error: 'lots' });
    expect(marginFor({ pair, price: 1.1, lots: 1, leverage: 0.5, account: 'USD' })).toEqual({ status: 'error', error: 'leverage' });
  });
});

describe('pip value with contract sizes', () => {
  it('gold: one pip (0.10) on one lot (100 oz) is $10', () => {
    expect(pipValue(getPair('XAU/USD'), 100, 'USD').inUsd).toBeCloseTo(10, 9);
  });

  it('GBP/JPY converts yen to dollars at the USD/JPY reference, not at the GBP/JPY price', () => {
    expect(pipValue(getPair('GBP/JPY'), 100000, 'USD').inUsd).toBeCloseTo(1000 / 155.5, 9);
  });

  it('USD/CHF: a pip on a lot is 10 CHF', () => {
    const v = pipValue(getPair('USD/CHF'), 100000, 'USD');
    expect(v.inQuote).toBeCloseTo(10, 9);
    expect(v.inUsd).toBeCloseTo(10 / 0.88, 9);
  });
});
