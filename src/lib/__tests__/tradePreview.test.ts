import { describe, expect, it } from 'vitest';
import { computePreview, forexQuoteCurrency, outcomeForPnl, pnlConflictsWithOutcome, type PreviewInput } from '../tradePreview';

const base: PreviewInput = {
  direction: 'LONG',
  entryPrice: 1.085,
  exitPrice: 1.0875,
  stopLoss: 1.084,
  takeProfit: 1.088,
  quantity: 0.5,
  lotSize: 100000,
  fees: 0,
  assetClass: 'forex',
  symbol: 'EURUSD',
  accountCurrency: 'USD',
  entryTime: new Date('2026-11-04T14:30:00Z'),
  exitTime: new Date('2026-11-04T16:15:00Z'),
};

describe('computePreview', () => {
  it('calculates EURUSD in a USD account', () => {
    const p = computePreview(base);
    expect(p.canAuto).toBe(true);
    expect(p.net).toBeCloseTo(125, 6);
    expect(p.riskAmount).toBeCloseTo(50, 6);
    expect(p.realisedR).toBeCloseTo(2.5, 6);
    expect(p.plannedRR).toBeCloseTo(3, 6);
    expect(p.holdingMinutes).toBe(105);
    expect(p.warnings).toEqual([]);
  });

  it('subtracts fees and mirrors shorts', () => {
    const p = computePreview({ ...base, direction: 'SHORT', entryPrice: 1.0875, exitPrice: 1.085, stopLoss: 1.0885, takeProfit: 1.084, fees: 5 });
    expect(p.net).toBeCloseTo(120, 6);
  });

  it('does not guess USDJPY P&L in a USD account', () => {
    const p = computePreview({ ...base, symbol: 'USDJPY', entryPrice: 150, exitPrice: 150.5, stopLoss: 149.5, takeProfit: 151 });
    expect(p.canAuto).toBe(false);
    expect(p.net).toBeNull();
    expect(p.gross).toBeCloseTo(25000, 4);
    expect(p.quoteCurrency).toBe('JPY');
    expect(p.reason).toMatch(/enter the P&L in USD/);
  });

  it('ignores broker suffixes when finding the quote currency', () => {
    expect(forexQuoteCurrency('EURUSD.m')).toBe('USD');
    expect(forexQuoteCurrency('gbp/jpy')).toBe('JPY');
    expect(forexQuoteCurrency('XAU')).toBeNull();
  });

  it('computes XAUUSD with a lot size of 100 and stocks with plain units', () => {
    const gold = computePreview({ ...base, symbol: 'XAUUSD', assetClass: 'commodity', lotSize: 100, entryPrice: 2592.69, exitPrice: 2604.29, quantity: 0.5, stopLoss: 2586.69, takeProfit: 2604.69 });
    expect(gold.canAuto).toBe(true);
    expect(gold.net).toBeCloseTo(580, 4);
    const stock = computePreview({ ...base, symbol: 'AAPL', assetClass: 'stock', lotSize: null, entryPrice: 100, exitPrice: 105, quantity: 10 });
    expect(stock.net).toBeCloseTo(50, 6);
  });

  it('requires a lot size for futures and options instead of assuming 1', () => {
    const p = computePreview({ ...base, symbol: 'NIFTY', assetClass: 'options', lotSize: null, entryPrice: 100, exitPrice: 120, quantity: 1 });
    expect(p.canAuto).toBe(false);
    expect(p.reason).toMatch(/lot size/i);
    const withLot = computePreview({ ...base, symbol: 'NIFTY', assetClass: 'options', lotSize: 50, entryPrice: 100, exitPrice: 120, quantity: 1, accountCurrency: 'INR' });
    expect(withLot.net).toBeCloseTo(1000, 6);
  });

  it('has no R without a stop and warns when levels sit on the wrong side', () => {
    expect(computePreview({ ...base, stopLoss: null }).realisedR).toBeNull();
    const p = computePreview({ ...base, stopLoss: 1.09, takeProfit: 1.08 });
    expect(p.warnings).toEqual(['Stop loss is above entry for a long.', 'Take profit is below entry for a long.']);
  });

  it('has no holding time when exit is before entry', () => {
    expect(computePreview({ ...base, exitTime: new Date('2026-11-04T14:00:00Z') }).holdingMinutes).toBeNull();
  });
});

describe('outcome helpers', () => {
  it('follows the P&L sign', () => {
    expect(outcomeForPnl(5)).toBe('TP');
    expect(outcomeForPnl(-0.01)).toBe('SL');
    expect(outcomeForPnl(0)).toBe('BREAKEVEN');
    expect(outcomeForPnl(null)).toBeNull();
  });

  it('flags a P&L that contradicts the outcome', () => {
    expect(pnlConflictsWithOutcome(-5, 'TP')).toBe(true);
    expect(pnlConflictsWithOutcome(5, 'SL')).toBe(true);
    expect(pnlConflictsWithOutcome(5, 'PARTIAL')).toBe(false);
  });
});
