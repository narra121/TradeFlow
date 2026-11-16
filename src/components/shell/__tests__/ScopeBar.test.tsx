import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const dispatch = vi.fn();
let queries: Record<string, unknown> = {};
let subscriptions: Record<string, Record<string, unknown>> = {};
vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (select: (s: unknown) => unknown) => select({ api: { queries, subscriptions }, trades: { filters: { datePreset: 'all', startDate: '2000-01-01', endDate: '2026-11-12', accountId: 'ALL' } } }),
}));
vi.mock('@/components/shell/AccountSwitcher', () => ({ AccountSwitcher: () => null }));
vi.mock('@/components/shell/ScopePeriod', () => ({ ScopePeriod: () => null }));
vi.mock('@/hooks/useOnline', () => ({ useOnline: () => true }));

import { ScopeBar } from '../ScopeBar';
import { ChromeProvider } from '@/components/shell/chrome';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';

const query = (endpointName: string, extra: Record<string, unknown> = {}) => ({ endpointName, status: 'fulfilled', fulfilledTimeStamp: Date.now() - 120_000, ...extra });
const render_ = () =>
  render(
    <MemoryRouter>
      <ChromeProvider>
        <ScopeBar scoped isMobile={false} />
      </ChromeProvider>
    </MemoryRouter>,
  );

describe('ScopeBar', () => {
  beforeEach(() => {
    dispatch.mockClear();
    subscriptions = {};
    queries = { 'getStats(a)': query('getStats') };
    subscriptions = { 'getStats(a)': { r1: {} } };
  });

  it('refetches only the stats and goals when the tab is shown again after a minute, not the trade lists (FE-025)', () => {
    render_();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0] as { type: string; payload: string[] };
    expect(action.payload).toEqual(['Stats', 'Goals']);
  });

  it('the refresh button still reloads trades, accounts, goals and rules', () => {
    render_();
    act(() => {
      screen.getByRole('button', { name: /Refresh data/ }).click();
    });
    const action = dispatch.mock.calls[0][0] as { payload: string[] };
    expect(action.payload).toEqual(['Trades', 'Stats', 'Accounts', 'Goals', 'Rules']);
  });

  it('a failed query nothing subscribes to (a goal-history period) does not turn the bar red (FE-062)', () => {
    queries['getGoalsProgress(h)'] = query('getGoalsProgress', { status: 'rejected', error: { status: 500, data: null } });
    render_();
    expect(screen.getByRole('button', { name: /Refresh data/ })).toHaveTextContent(/Updated/);
    expect(screen.queryByText(/Couldn't refresh/)).toBeNull();
  });

  it('prints Updated on the Settings time zone clock, not the browser clock', () => {
    patchUiState({ timeZone: 'Pacific/Kiritimati' }); // UTC+14
    try {
      const at = Date.UTC(2026, 10, 16, 12, 5);
      queries = { 'getStats(a)': query('getStats', { fulfilledTimeStamp: at }) };
      render_();
      expect(screen.getByRole('button', { name: /Refresh data/ })).toHaveTextContent('Updated 02:05');
    } finally {
      patchUiState({ timeZone: undefined });
      resetUiStateCache();
    }
  });

  it('a failed query the screen subscribes to still does', () => {
    queries['getGoalsProgress(c)'] = query('getGoalsProgress', { status: 'rejected', error: { status: 500, data: null } });
    subscriptions['getGoalsProgress(c)'] = { r2: {} };
    render_();
    expect(screen.getByText(/Couldn't refresh/)).toBeInTheDocument();
  });
});
