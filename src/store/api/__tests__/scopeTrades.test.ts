import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayBound, fetchAllScopeTrades, SCOPE_TRADE_CEILING } from '../tradesApi';
import { patchUiState } from '@/hooks/useUiState';

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

  it('reads only the newest trade with one request of limit 1 (the backend answers newest first)', async () => {
    const fetchPage = vi.fn(async (_arg: { params: Record<string, unknown> }) => page([backendTrade(9)], 'more'));
    const res = await fetchAllScopeTrades({ accountId: 'ALL' }, fetchPage, 1);
    expect('data' in res && res.data.map((t) => t.id)).toEqual(['t9']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0][0].params).toMatchObject({ limit: 1 });
  });

  it('returns the error of a failed page instead of a partial list', async () => {
    let n = 0;
    const fetchPage = vi.fn(async () => (++n === 2 ? { error: { status: 500 } } : page([backendTrade(n)], 'next')));
    const res = await fetchAllScopeTrades({}, fetchPage);
    expect(res).toEqual({ error: { status: 500 } });
  });
});

describe('local days are sent as instants (X-014)', () => {
  afterEach(() => patchUiState({ timeZone: '' }));

  it('a New York day runs from local midnight to the next local midnight minus 1 ms', () => {
    patchUiState({ timeZone: 'America/New_York' });
    // 12 Nov: UTC-5. A trade at 20:30 local is 01:30Z on 13 Nov, which a UTC day 12 Nov would miss.
    expect(dayBound('2026-11-12', 'start')).toBe('2026-11-12T05:00:00.000Z');
    expect(dayBound('2026-11-12', 'end')).toBe('2026-11-13T04:59:59.999Z');
    expect('2026-11-13T01:30:00.000Z' >= dayBound('2026-11-12', 'start') && '2026-11-13T01:30:00.000Z' <= dayBound('2026-11-12', 'end')).toBe(true);
  });

  it('an Indian new year starts at 18:30Z the evening before', () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    expect(dayBound('2027-01-01', 'start')).toBe('2026-12-31T18:30:00.000Z');
    expect(dayBound('2027-01-01', 'end')).toBe('2027-01-01T18:29:59.999Z');
  });

  it('a daylight-saving day is 25 hours long on the clock (New York, 1 Nov 2026)', () => {
    patchUiState({ timeZone: 'America/New_York' });
    const span = Date.parse(dayBound('2026-11-01', 'end')) - Date.parse(dayBound('2026-11-01', 'start')) + 1;
    expect(span).toBe(25 * 3600_000);
  });

  it('anything that is not a bare date (an instant, undefined) is passed through', () => {
    expect(dayBound('2026-11-12T10:00:00.000Z', 'start')).toBe('2026-11-12T10:00:00.000Z');
  });

  it('the requests carry the instants for the scope', async () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    const fetchPage = vi.fn(async (_arg: { params: Record<string, unknown> }) => page([backendTrade(1)], null));
    await fetchAllScopeTrades({ accountId: 'ALL', startDate: '2027-01-01', endDate: '2027-01-01' }, fetchPage);
    expect(fetchPage.mock.calls[0][0].params).toMatchObject({ startDate: '2026-12-31T18:30:00.000Z', endDate: '2027-01-01T18:29:59.999Z' });
  });
});
