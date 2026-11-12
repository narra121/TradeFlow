import { describe, expect, it } from 'vitest';
import { groupTrades } from '../tradeGroups';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map(
  [
    { id: 'u', currency: 'USD', name: 'FTMO' },
    { id: 'i', currency: 'INR', name: 'Zerodha' },
  ].map((a) => [a.id, a as TradingAccount]),
);

const t = (id: string, over: Partial<Trade> = {}): Trade =>
  ({
    id, symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1,
    entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'u', ...over,
  }) as Trade;

describe('groupTrades', () => {
  it('returns nothing for "none"', () => {
    expect(groupTrades([t('1')], 'none', accounts)).toEqual([]);
  });

  it('groups by day keeping the incoming order and counts W / L', () => {
    const g = groupTrades([t('1'), t('2', { pnl: -4 }), t('3', { exitDate: '2026-11-03T11:00:00' })], 'day', accounts);
    expect(g.map((x) => x.label)).toEqual(['Wed 4 Nov 2026', 'Tue 3 Nov 2026']);
    expect(g[0]).toMatchObject({ wins: 1, losses: 1 });
    expect(g[0].net).toEqual([{ currency: 'USD', value: 6 }]);
  });

  it('never sums two currencies in one group', () => {
    const g = groupTrades([t('1', { pnl: 5 }), t('2', { pnl: 900, accountId: 'i' })], 'symbol', accounts);
    expect(g[0].net).toEqual([{ currency: 'USD', value: 5 }, { currency: 'INR', value: 900 }]);
  });

  it('orders non-date groups by net, worst first', () => {
    const g = groupTrades([t('1', { symbol: 'A', pnl: 50 }), t('2', { symbol: 'B', pnl: -30 }), t('3', { symbol: 'C', pnl: 5 })], 'symbol', accounts);
    expect(g.map((x) => x.label)).toEqual(['B', 'C', 'A']);
  });

  it('labels missing values in words and sums R over trades that have one', () => {
    const g = groupTrades([t('1', { strategy: undefined }), t('2', { stopLoss: 0 })], 'strategy', accounts);
    expect(g[0].label).toBe('No strategy');
    expect(g[0].totalR).toBeCloseTo(1, 5);
  });
});
