import { describe, expect, it, vi } from 'vitest';
import { fetchAllScopeTrades, SCOPE_TRADE_CEILING } from '../tradesApi';

function backendTrade(i: number) {
  return {
    tradeId: `t${i}`,
    symbol: 'EURUSD',
    side: 'BUY',
    quantity: 1,
    entryPrice: 1,
    exitPrice: 1.1,
    openDate: '2026-11-01T10:00:00Z',
    closeDate: '2026-11-01T11:00:00Z',
    outcome: 'TP',
    pnl: 10,
    accountId: 'a1',
    assetClass: 'forex',
    fees: 0.5,
  };
}

const page = (trades: unknown[], nextCursor: string | null) => ({
  data: { trades, pagination: { nextCursor, hasMore: !!nextCursor, limit: 100 } },
});

describe('fetchAllScopeTrades', () => {
  it('pages /trades to completion and maps contract fields', async () => {
    const fetchPage = vi.fn(async (arg: { params: Record<string, unknown> }) => {
      if (!arg.params.cursor) return page([backendTrade(1), backendTrade(2)], 'c1');
      if (arg.params.cursor === 'c1') return page([backendTrade(3)], 'c2');
      return page([backendTrade(4)], null);
    });
    const res = await fetchAllScopeTrades({ accountId: 'ALL', startDate: '2026-01-01', endDate: '2026-12-31' }, fetchPage);
    expect('data' in res && res.data.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4']);
    expect('data' in res && res.data[0]).toMatchObject({ assetClass: 'forex', fees: 0.5, accountId: 'a1' });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[0][0].params).toMatchObject({ limit: 100, accountId: 'ALL' });
  });

  it('stops at the ceiling', async () => {
    const fetchPage = vi.fn(async () => page(Array.from({ length: 100 }, (_, i) => backendTrade(i)), 'more'));
    const res = await fetchAllScopeTrades({}, fetchPage);
    expect('data' in res && res.data.length).toBe(SCOPE_TRADE_CEILING);
    expect(fetchPage).toHaveBeenCalledTimes(SCOPE_TRADE_CEILING / 100);
  });

  it('returns the error of a failed page instead of a partial list', async () => {
    let n = 0;
    const fetchPage = vi.fn(async () => (++n === 2 ? { error: { status: 500 } } : page([backendTrade(n)], 'next')));
    const res = await fetchAllScopeTrades({}, fetchPage);
    expect(res).toEqual({ error: { status: 500 } });
  });
});
