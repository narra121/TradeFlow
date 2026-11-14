import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, applyFilters, chunk, distinctValues, hasActiveFilters, loadListState, realisedR, saveListState, sortTrades, summarise } from '../tradeFilters';
import { computePreview } from '../tradePreview';
import { computePnl } from '../pnl';
import type { Trade, TradingAccount } from '@/types/trade';

const acc = (id: string, currency: string, name = id) => ({ id, currency, name }) as TradingAccount;
const accounts = new Map([acc('a1', 'USD'), acc('a2', 'INR')].map((a) => [a.id, a]));

const t = (id: string, over: Partial<Trade> = {}): Trade =>
  ({
    id, symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1,
    entryDate: '2026-11-01T10:00:00Z', exitDate: '2026-11-01T11:00:00Z', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1', ...over,
  }) as Trade;

const list = [
  t('1', { symbol: 'EURUSD', pnl: 100, strategy: 'Pullback', mistakes: ['FOMO'], exitDate: '2026-11-03T11:00:00Z' }),
  t('2', { symbol: 'XAUUSD', pnl: -50, outcome: 'SL', session: 'London', exitDate: '2026-11-02T11:00:00Z' }),
  t('3', { symbol: 'NIFTY', pnl: 500, accountId: 'a2', outcome: 'TP', exitDate: '2026-11-01T11:00:00Z' }),
  t('4', { symbol: 'EURUSD', pnl: 20, accountId: undefined, outcome: 'BREAKEVEN', exitDate: '2026-10-30T11:00:00Z' }),
];

describe('applyFilters', () => {
  it('finds a trade by symbol search, case-insensitively', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, q: 'xau' }).map((x) => x.id)).toEqual(['2']);
  });

  it('combines facets with AND and values within a facet with OR', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, symbols: ['EURUSD', 'NIFTY'], outcomes: ['TP'] }).map((x) => x.id)).toEqual(['1', '3']);
    expect(applyFilters(list, { ...EMPTY_FILTERS, mistakes: ['FOMO'] }).map((x) => x.id)).toEqual(['1']);
    expect(applyFilters(list, { ...EMPTY_FILTERS, sessions: ['London'] }).map((x) => x.id)).toEqual(['2']);
  });

  it('reports whether any filter is active', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: ' x ' })).toBe(true);
  });
});

describe('sortTrades', () => {
  it('sorts by date newest first and by P&L ascending', () => {
    expect(sortTrades(list, { key: 'date', dir: 'desc' }, accounts).map((x) => x.id)).toEqual(['1', '2', '3', '4']);
    expect(sortTrades(list, { key: 'pnl', dir: 'asc' }, accounts).map((x) => x.id)).toEqual(['2', '4', '1', '3']);
  });

  it('keeps missing R at the bottom when sorting descending', () => {
    const withR = [t('a', { stopLoss: 0, pnl: 5 }), t('b', { stopLoss: 0.9, pnl: 5 })];
    expect(sortTrades(withR, { key: 'r', dir: 'desc' }, accounts).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('summarise', () => {
  it('sums per currency and counts trades without an account separately', () => {
    const s = summarise(list, accounts);
    expect(s.count).toBe(4);
    expect(s.winRate).toBe(75);
    expect(s.byCurrency).toEqual([
      { currency: 'USD', trades: 2, net: 50 },
      { currency: 'INR', trades: 1, net: 500 },
    ]);
    expect(s.noAccount).toBe(1);
  });

  it('has no win rate for an empty list', () => {
    expect(summarise([], accounts).winRate).toBeNull();
  });
});

describe('helpers', () => {
  it('lists distinct values with counts, most common first', () => {
    expect(distinctValues(list, (x) => x.symbol)).toEqual([
      { value: 'EURUSD', count: 2 },
      { value: 'NIFTY', count: 1 },
      { value: 'XAUUSD', count: 1 },
    ]);
  });

  it('chunks ids for bulk delete', () => {
    expect(chunk(Array.from({ length: 120 }, (_, i) => i), 50).map((c) => c.length)).toEqual([50, 50, 20]);
  });

  it('persists list state in session storage', () => {
    sessionStorage.clear();
    expect(loadListState()).toBeNull();
    saveListState({ ...EMPTY_FILTERS, q: 'eur', page: 3 });
    expect(loadListState()).toMatchObject({ q: 'eur', page: 3 });
  });
});

describe('R multiple: one definition (CONTRACT I2, from prices, before fees)', () => {
  // The pinned vector of lib/pnl: short, 4 units, entry 50, exit 53, stop 52, fees 0.4 -> net -12.4, R -1.5.
  const short = { entryPrice: 50, exitPrice: 53, stopLoss: 52, size: 4, direction: 'SHORT' as const, pnl: -12.4 };

  it('the trade list, the pnl module and the form preview give the same R', () => {
    const fromList = realisedR(t('s', { ...short, contractMultiplier: 1 }));
    const fromPnl = computePnl({ side: 'SELL', quantity: 4, entryPrice: 50, exitPrice: 53, stopLoss: 52, fees: 0.4 }).rMultiple;
    const fromPreview = computePreview({ direction: 'SHORT', assetClass: 'stock', symbol: 'ABC', entryPrice: 50, exitPrice: 53, stopLoss: 52, takeProfit: null, quantity: 4, lotSize: null, fees: 0.4, accountCurrency: 'USD', entryTime: null, exitTime: null }).realisedR;
    expect([fromList, fromPnl, fromPreview]).toEqual([-1.5, -1.5, -1.5]);
  });

  it('the lot size and the stored P&L do not change it', () => {
    expect(realisedR(t('s', short))).toBe(-1.5);
    expect(realisedR(t('s', { ...short, contractMultiplier: 100, pnl: -9999 }))).toBe(-1.5);
  });

  it('is null without a stop or for an open trade (no exit price)', () => {
    expect(realisedR(t('s', { ...short, stopLoss: undefined }))).toBeNull();
    expect(realisedR(t('s', { ...short, exitPrice: 0, exitDate: undefined }))).toBeNull();
  });
});
