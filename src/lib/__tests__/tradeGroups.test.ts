import { afterEach, describe, expect, it } from 'vitest';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
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
    const g = groupTrades([t('1'), t('2', { pnl: -4 }), t('3', { entryDate: '2026-11-03T10:00:00', exitDate: '2026-11-03T11:00:00' })], 'day', accounts);
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

  it('counts a trade of an account saved without a currency as USD instead of dropping it from the net', () => {
    const bare = new Map([['n', { id: 'n', name: 'Bare' } as TradingAccount]]);
    const g = groupTrades([t('1', { pnl: 7, accountId: 'n' })], 'symbol', bare);
    expect(g[0].net).toEqual([{ currency: 'USD', value: 7 }]);
  });

  describe('day, week and month follow the saved time zone', () => {
    afterEach(() => {
      localStorage.clear();
      resetUiStateCache();
    });
    // A trade that closes on Sun 1 Nov 2026 at 23:30 UTC.
    const late = (zone: string) => {
      patchUiState({ timeZone: zone });
      return t('1', { entryDate: '2026-11-01T22:30:00.000Z', exitDate: '2026-11-01T23:30:00.000Z' });
    };

    it('puts the same trade on different days, weeks and months for different zones', () => {
      // Sun 1 Nov 23:30 UTC = Sun 1 Nov 18:30 New York (week of 26 Oct, month 2026-11) and Mon 2 Nov 05:00 Kolkata (week of 02 Nov).
      const ny = groupTrades([late('America/New_York')], 'week', accounts)[0];
      expect(ny.key).toBe('2026-10-26');
      expect(ny.label).toBe('Week of 26 Oct 2026');
      const kol = groupTrades([late('Asia/Kolkata')], 'week', accounts)[0];
      expect(kol.key).toBe('2026-11-02');
      expect(groupTrades([late('America/New_York')], 'day', accounts)[0].label).toBe('Sun 1 Nov 2026');
      expect(groupTrades([late('Asia/Kolkata')], 'day', accounts)[0].label).toBe('Mon 2 Nov 2026');
    });

    it('a trade near a month end changes month with the zone', () => {
      patchUiState({ timeZone: 'America/New_York' });
      const g = (opened: string) => groupTrades([t('1', { entryDate: opened, exitDate: '2026-12-01T01:00:00.000Z' })], 'month', accounts)[0];
      // Opened 30 Nov 23:30 UTC: 30 Nov 18:30 in New York but 1 Dec 05:00 in Kolkata
      expect(g('2026-11-30T23:30:00.000Z')).toMatchObject({ key: '2026-11', label: 'November 2026' });
      patchUiState({ timeZone: 'Asia/Kolkata' });
      expect(g('2026-11-30T23:30:00.000Z')).toMatchObject({ key: '2026-12', label: 'December 2026' });
    });
  });

  it('labels missing values in words and sums R over trades that have one', () => {
    const g = groupTrades([t('1', { strategy: undefined }), t('2', { stopLoss: 0 })], 'strategy', accounts);
    expect(g[0].label).toBe('No strategy');
    expect(g[0].totalR).toBeCloseTo(1, 5);
  });
});
