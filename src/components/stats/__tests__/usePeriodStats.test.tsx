import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

const getStats = vi.fn();
vi.mock('@/store/api', () => ({ useGetStatsQuery: (args: unknown) => getStats(args) }));
vi.mock('../useScopeCapital', () => ({ useScopeCapital: () => ({ totalCapital: 100000, accountsReady: true }) }));

import { usePeriodStats } from '../usePeriodStats';
import { useCompare } from '../useCompare';

function Probe({ skip }: { skip?: boolean }) {
  const r = usePeriodStats({ skip });
  const [, setOn] = useCompare();
  return (
    <>
      <p data-testid="prev">{r.prev ? 'has prev' : 'no prev'}</p>
      <p data-testid="range">{r.prevRange?.name ?? 'none'}</p>
      <button onClick={() => setOn(false)}>off</button>
    </>
  );
}

const month = { trades: { filters: { accountId: 'ALL', startDate: '2026-11-01', endDate: '2026-11-11', datePreset: 'thisMonth' as const } } };
const all = { trades: { filters: { accountId: 'ALL', startDate: '2000-01-01', endDate: '2026-11-11', datePreset: 'all' as const } } };

afterEach(() => {
  getStats.mockReset();
  localStorage.removeItem('tq.compare');
});

describe('usePeriodStats', () => {
  it('requests the period and the equal previous period with the same account and capital', () => {
    getStats.mockImplementation((args) => { const d = args === skipToken ? undefined : { totalTrades: 1, startDate: (args as { startDate: string }).startDate }; return { data: d, currentData: d, isLoading: false }; });
    renderWithProviders(<Probe />, { preloadedState: month as never });
    const calls = getStats.mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(calls).toEqual([
      { accountId: 'ALL', totalCapital: 100000, startDate: '2026-11-01', endDate: '2026-11-11', includeEquityCurve: undefined },
      { accountId: 'ALL', totalCapital: 100000, startDate: '2026-10-01', endDate: '2026-10-11' }, // the same eleven days of the month before (FE-022)
    ]);
    expect(screen.getByTestId('prev')).toHaveTextContent('has prev');
    expect(screen.getByTestId('range')).toHaveTextContent('Oct');
  });

  it('makes no second request for All time', () => {
    getStats.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<Probe />, { preloadedState: all as never });
    expect(getStats.mock.calls[1][0]).toBe(skipToken);
    expect(screen.getByTestId('prev')).toHaveTextContent('no prev');
  });

  it('makes no second request once Compare is switched off', async () => {
    getStats.mockReturnValue({ data: undefined, isLoading: false });
    renderWithProviders(<Probe />, { preloadedState: month as never });
    getStats.mockClear();
    screen.getByText('off').click();
    await vi.waitFor(() => expect(getStats.mock.calls.some((c) => c[0] === skipToken)).toBe(true));
    const last = getStats.mock.calls.slice(-2);
    expect(last[1][0]).toBe(skipToken);
  });

  it('a previous period without trades is no comparison: no prev, prevEmpty set (no zeros are compared)', () => {
    getStats.mockImplementation((args) => { const d = args === skipToken ? undefined : { totalTrades: (args as { startDate: string }).startDate === '2026-11-01' ? 5 : 0 }; return { data: d, currentData: d, isLoading: false }; });
    function Empty() {
      const r = usePeriodStats();
      const [on, setOn] = useCompare();
      useEffect(() => { if (!on) setOn(true); }, [on, setOn]);
      return <p data-testid="state">{`${r.prev ? 'has prev' : 'no prev'} ${r.prevEmpty ? 'empty' : 'not empty'} ${r.prevRange?.name}`}</p>;
    }
    renderWithProviders(<Empty />, { preloadedState: month as never });
    expect(screen.getByTestId('state')).toHaveTextContent('no prev empty Oct');
  });

  it('a new scope shows no figures from the last one: it is loading until its own answer arrives (L22-R2)', () => {
    // RTK while the arguments change: `data` still holds the last scope's answer, `currentData` is empty.
    getStats.mockReturnValue({ data: { totalTrades: 7 }, currentData: undefined, isLoading: false, isFetching: true });
    function Scope() {
      const r = usePeriodStats();
      return <p data-testid="scope">{`${r.stats ? `trades ${r.stats.totalTrades}` : 'no stats'} ${r.isLoading ? 'loading' : 'ready'}`}</p>;
    }
    renderWithProviders(<Scope />, { preloadedState: month as never });
    expect(screen.getByTestId('scope')).toHaveTextContent('no stats loading');
  });

  it('requests nothing while skipped (a locked tab never asks for its data)', () => {
    getStats.mockReturnValue({ data: undefined, isLoading: false });
    renderWithProviders(<Probe skip />, { preloadedState: month as never });
    expect(getStats.mock.calls.every((c) => c[0] === skipToken)).toBe(true);
  });
});
