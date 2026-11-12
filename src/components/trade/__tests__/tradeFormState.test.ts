import { describe, expect, it } from 'vitest';
import { emptyForm, formFromTrade, fromLocalInput, parseNum, toLocalInput, validateForm, type TradeFormState } from '../tradeFormState';
import type { Trade } from '@/types/trade';

const valid = (over: Partial<TradeFormState> = {}): TradeFormState => ({
  ...emptyForm({ accountIds: ['a1'] }),
  symbol: 'EURUSD',
  entryPrice: '1.085',
  exitPrice: '1.0875',
  quantity: '0.5',
  entryTime: '2026-11-04T14:30',
  exitTime: '2026-11-04T16:15',
  ...over,
});

describe('validateForm', () => {
  it('passes a complete form', () => {
    expect(validateForm(valid(), { hasAccounts: true, pnlAvailable: true })).toEqual({});
  });

  it('reports every missing required field inline', () => {
    const errors = validateForm(emptyForm({ accountIds: [] }), { hasAccounts: true, pnlAvailable: false });
    expect(Object.keys(errors).sort()).toEqual(['accountIds', 'entryPrice', 'entryTime', 'exitPrice', 'manualPnl', 'quantity', 'symbol']);
  });

  it('blocks an exit before the entry and a zero or negative exit price', () => {
    expect(validateForm(valid({ exitTime: '2026-11-04T14:00' }), { hasAccounts: true, pnlAvailable: true }).exitTime).toMatch(/before/);
    expect(validateForm(valid({ exitPrice: '-1' }), { hasAccounts: true, pnlAvailable: true }).exitPrice).toBeDefined();
    expect(validateForm(valid({ exitPrice: '0' }), { hasAccounts: true, pnlAvailable: true }).exitPrice).toBeDefined();
  });

  it('requires option fields for options and does not require an account when there are none', () => {
    const e = validateForm(valid({ assetClass: 'options', accountIds: [] }), { hasAccounts: false, pnlAvailable: true });
    expect(Object.keys(e).sort()).toEqual(['expiry', 'optionType', 'strike']);
  });

  it('rejects non-numeric optional numbers', () => {
    expect(validateForm(valid({ stopLoss: 'abc' }), { hasAccounts: true, pnlAvailable: true }).stopLoss).toBeDefined();
  });
});

describe('form <-> trade', () => {
  const trade = {
    id: 't1', symbol: 'XAUUSD', direction: 'SHORT', entryPrice: 2600, exitPrice: 2590, stopLoss: 2610, takeProfit: 0, size: 0.5,
    entryDate: '2026-11-04T09:15:00.000Z', exitDate: '2026-11-04T09:31:00.000Z', outcome: 'TP', pnl: 5.8, riskRewardRatio: 0,
    accountId: 'acc-1', mistakes: ['FOMO'], assetClass: 'commodity', contractMultiplier: 100, fees: 1.2,
  } as Trade;

  it('keeps the stored P&L as a manual value on edit', () => {
    const f = formFromTrade(trade);
    expect(f.manualPnl).toBe('5.8');
    expect(f.outcomeTouched).toBe(true);
    expect(f.lotSize).toBe('100');
    expect(f.takeProfit).toBe('');
    expect(f.accountIds).toEqual(['acc-1']);
  });

  it('duplicates the setup but not the prices', () => {
    const f = emptyForm({ accountIds: ['x'], from: trade });
    expect(f).toMatchObject({ symbol: 'XAUUSD', direction: 'SHORT', quantity: '0.5', accountIds: ['acc-1'] });
    expect(f.entryPrice).toBe('');
    expect(f.exitPrice).toBe('');
  });

  it('prefills the day for "add trade on this day"', () => {
    const f = emptyForm({ accountIds: [], date: '2026-10-02' });
    expect(f.entryTime.startsWith('2026-10-02')).toBe(true);
    expect(f.exitTime).toBe('');
  });
});

describe('helpers', () => {
  it('round-trips local datetime values', () => {
    const d = new Date(2026, 10, 4, 14, 30);
    expect(toLocalInput(d)).toBe('2026-11-04T14:30');
    expect(fromLocalInput('2026-11-04T14:30')?.getTime()).toBe(d.getTime());
    expect(fromLocalInput('')).toBeNull();
  });

  it('parses numbers strictly', () => {
    expect(parseNum(' 1.5 ')).toBe(1.5);
    expect(parseNum('')).toBeNull();
    expect(parseNum('1,5')).toBeNull();
  });
});

describe('asset class of a trade saved before the field existed (R-fe-app-012)', () => {
  const base = { id: 'x', direction: 'LONG', entryPrice: 2950, exitPrice: 2920, stopLoss: 0, takeProfit: 0, size: 50, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'SL', pnl: -1476.84 } as never as import('@/types/trade').Trade;

  it('does not treat an NSE stock as 100,000-unit forex lots', () => {
    const f = formFromTrade({ ...base, symbol: 'RELIANCE' });
    expect(f.assetClass).toBe('stock');
    expect(f.lotSize).toBe('');
    expect(f.assetClassInferred).toBe(true);
  });

  it('recognises a currency pair, including a broker suffix', () => {
    expect(formFromTrade({ ...base, symbol: 'EURUSD.m' }).assetClass).toBe('forex');
    expect(formFromTrade({ ...base, symbol: 'GBPJPY' }).lotSize).toBe('100000');
  });

  it('keeps the stored class and adds no flag', () => {
    const f = formFromTrade({ ...base, symbol: 'NIFTY', assetClass: 'futures' });
    expect(f.assetClass).toBe('futures');
    expect(f.assetClassInferred).toBeUndefined();
  });
});
