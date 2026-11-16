import { describe, expect, it } from 'vitest';
import { emptyForm, formFromTrade, fromLocalInput, imagesKey, LIMITS, parseNum, serverFieldErrors, toLocalInput, validateForm, type TradeFormState } from '../tradeFormState';
import type { Trade } from '@/types/trade';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { browserZone } from '@/components/settings/timeZones';

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

  it('blocks an exit before the entry and a negative exit price', () => {
    expect(validateForm(valid({ exitTime: '2026-11-04T14:00' }), { hasAccounts: true, pnlAvailable: true }).exitTime).toMatch(/before/);
    expect(validateForm(valid({ exitPrice: '-1' }), { hasAccounts: true, pnlAvailable: true }).exitPrice).toBeDefined();
  });

  it('accepts an exit price of 0, as the API does (an option that expired worthless, FE-015)', () => {
    expect(validateForm(valid({ exitPrice: '0' }), { hasAccounts: true, pnlAvailable: true }).exitPrice).toBeUndefined();
  });

  it('rejects a manual net P&L that is not a number instead of letting it save as 0 (FE-004)', () => {
    for (const text of ['$50', 'abc', '-', '1.2.3']) {
      expect(validateForm(valid({ manualPnl: text }), { hasAccounts: true, pnlAvailable: true }).manualPnl).toBe('Enter a number.');
    }
    for (const text of ['1,234.50', '\u221250', '-50', '0']) {
      expect(validateForm(valid({ manualPnl: text }), { hasAccounts: true, pnlAvailable: true }).manualPnl).toBeUndefined();
    }
  });

  it('flags text longer than the API allows before the request (X-011)', () => {
    const e = validateForm(valid({ notes: 'x'.repeat(LIMITS.notes + 1), keyLesson: 'y'.repeat(LIMITS.keyLesson + 1), tags: Array.from({ length: LIMITS.tags + 1 }, (_, i) => `t${i}`) }), { hasAccounts: true, pnlAvailable: true });
    expect(e.notes).toMatch(/4000/);
    expect(e.keyLesson).toMatch(/256/);
    expect(e.tags).toMatch(/10 tags/);
    expect(validateForm(valid({ notes: 'x'.repeat(LIMITS.notes) }), { hasAccounts: true, pnlAvailable: true }).notes).toBeUndefined();
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

  it('keeps a stored exit price of 0 in the form (FE-015)', () => {
    expect(formFromTrade({ ...trade, exitPrice: 0 }).exitPrice).toBe('0');
    expect(formFromTrade({ ...trade, takeProfit: 0 }).takeProfit).toBe('');
  });

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

  it('prefills that day at midnight in the Settings time zone, whatever the browser zone', () => {
    // A Settings zone other than the browser's: the browser's midnight of the 2nd falls on another clock time there.
    patchUiState({ timeZone: browserZone() === 'Pacific/Pago_Pago' ? 'Pacific/Kiritimati' : 'Pacific/Pago_Pago' });
    try {
      expect(emptyForm({ accountIds: [], date: '2026-10-02' }).entryTime).toBe('2026-10-02T00:00');
    } finally {
      localStorage.clear();
      resetUiStateCache();
    }
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

  it('accepts thousands separators and the Unicode minus, and rejects other text (FE-004)', () => {
    expect(parseNum('1,234.50')).toBe(1234.5);
    expect(parseNum('-1,234,567')).toBe(-1234567);
    expect(parseNum('\u221250')).toBe(-50);
    expect(parseNum('+5')).toBe(5);
    expect(parseNum('.5')).toBe(0.5);
    for (const text of ['$50', '-', '.', '1e5', '0x10', 'Infinity', '12,34', '1.2.3', '50%']) expect(parseNum(text)).toBeNull();
  });

  it('compares screenshots by id, timeframe and description only (FE-012)', () => {
    const img = { id: 'a', timeframe: '1H', description: 'x', url: 'data:image/png;base64,AAAA' };
    expect(imagesKey([img])).toBe(imagesKey([{ ...img, url: 'data:image/png;base64,BBBB' }]));
    expect(imagesKey([img])).not.toBe(imagesKey([{ ...img, description: 'y' }]));
  });

  it("puts a 400's field errors on the form fields (X-011)", () => {
    const err = { status: 400, data: { error: { fields: [{ field: 'tradeNotes', message: 'Notes can have at most 4000 characters' }, { field: 'lessons.0', message: 'Lesson can have at most 256 characters' }, { field: 'unknown', message: 'x' }] } } };
    expect(serverFieldErrors(err)).toEqual({ notes: 'Notes can have at most 4000 characters', keyLesson: 'Lesson can have at most 256 characters' });
    expect(serverFieldErrors({ status: 500, data: null })).toEqual({});
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
