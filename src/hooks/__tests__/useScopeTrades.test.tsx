import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

const scopeQuery = vi.fn();
vi.mock('@/store/api/tradesApi', () => ({
  SCOPE_TRADE_CEILING: 5000,
  useGetScopeTradesQuery: (args: unknown, opts: unknown) => scopeQuery(args, opts),
  useGetNewestTradeQuery: () => ({ data: undefined, currentData: undefined, isLoading: false, isFetching: false }),
}));

import { useScopeTrades } from '../useScopeTrades';

const state = { trades: { filters: { accountId: 'usd-1', startDate: '2026-11-01', endDate: '2026-11-30', datePreset: 'thisMonth' as const } } };

function Probe() {
  const r = useScopeTrades();
  return <p data-testid="scope">{`${r.trades.map((t) => t.symbol).join(',') || 'none'} ${r.isLoading ? 'loading' : 'ready'}`}</p>;
}

afterEach(() => scopeQuery.mockReset());

describe('useScopeTrades', () => {
  it('a new scope shows none of the last scope\'s trades: it is loading until its own answer arrives (L22-R3)', () => {
    // RTK while the arguments change: `data` still holds the last scope's trades, `currentData` is empty.
    scopeQuery.mockReturnValue({ data: [{ id: 'a', symbol: 'NIFTY' }], currentData: undefined, isLoading: false, isFetching: true });
    renderWithProviders(<Probe />, { preloadedState: state as never });
    expect(screen.getByTestId('scope')).toHaveTextContent('none loading');
  });

  it('keeps the scope\'s own trades on screen while they are refetched (no flash after a save)', () => {
    const own = [{ id: 'b', symbol: 'EURUSD', exitDate: '2026-11-10T10:00:00Z' }];
    scopeQuery.mockReturnValue({ data: own, currentData: own, isLoading: false, isFetching: true });
    renderWithProviders(<Probe />, { preloadedState: state as never });
    expect(screen.getByTestId('scope')).toHaveTextContent('EURUSD ready');
  });
});
