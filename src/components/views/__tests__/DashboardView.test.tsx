import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import type { AggregatedStats } from '@/types/stats';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const periodStats = vi.fn();
const scopeTrades = vi.fn();
const capital = vi.fn();

vi.mock('@/components/stats/usePeriodStats', () => ({ usePeriodStats: () => periodStats() }));
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => capital() }));
vi.mock('@/hooks/useScopeTrades', () => ({ useScopeTrades: (...a: unknown[]) => scopeTrades(...a) }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openTrade: vi.fn(), openNew: vi.fn() }) }));
vi.mock('@/components/dashboard/useWeekGoals', () => ({ useWeekGoals: () => ({ isLoading: false, isError: false, goals: [], brokenRules: 0, hasRules: false }) }));
vi.mock('@/components/dashboard/MonthHeat', () => ({ MonthHeat: () => <section aria-label="Month heat map" /> }));
vi.mock('@/components/onboarding/FirstRunPage', () => ({ FirstRunPage: () => <section aria-label="First run" /> }));
vi.mock('@/components/dashboard/LatestInsight', () => ({ LatestInsight: () => null }));

import { DashboardView } from '../DashboardView';

const usd = { id: 'a', name: 'FTMO', currency: 'USD', balance: 101240, initialBalance: 100000 };
const inr = { id: 'b', name: 'Zerodha', currency: 'INR', balance: 443000, initialBalance: 400000 };

const stats = {
  totalTrades: 24, wins: 14, losses: 10, winRate: 58.3, totalPnl: 1412.3, profitFactor: 1.84, avgRiskReward: 1.5, maxDrawdown: 2.1,
  dailyPnl: [{ date: '2026-11-03', pnl: 10, cumulativePnl: 10 }],
} as unknown as AggregatedStats;

const t = (id: string, accountId: string, pnl: number) => ({ id, accountId, pnl, symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 2, stopLoss: 0, size: 1, entryDate: '2026-11-03T09:00:00', exitDate: '2026-11-03T10:00:00', outcome: 'TP' });

const period = (over: Record<string, unknown> = {}) => ({
  stats, prev: undefined, prevRange: null, canCompare: false, isLoading: false, isError: false, refetch: vi.fn(), accountsReady: true, ...over,
});

beforeEach(() => {
  capital.mockReset().mockReturnValue({ accounts: [usd], selectedAccountId: 'a', totalCapital: 100000, accountsReady: true, accountsLoading: false, accountsError: false });
  periodStats.mockReset().mockReturnValue(period());
  scopeTrades.mockReset().mockReturnValue({ trades: [t('1', 'a', 120)], isLoading: false, isError: false, truncated: false, refetch: vi.fn() });
});

describe('DashboardView', () => {
  it('prints the stat strip as a dl with the balance first for one account', () => {
    renderWithProviders(<DashboardView />);
    const strip = screen.getByLabelText('Period statistics');
    expect(strip.tagName).toBe('DL');
    const labels = Array.from(strip.querySelectorAll('dt')).map((d) => d.textContent);
    expect(labels).toEqual(['Balance', 'Net P&L', 'Win rate', 'Profit factor', 'Planned R:R', 'Max drawdown']);
    expect(screen.getByText('$101,240.00')).toBeInTheDocument();
    expect(screen.getByText('+1.2% since start')).toBeInTheDocument();
    expect(screen.getByText('14W · 10L · 24 trades')).toBeInTheDocument();
    expect(screen.getByText('+$1,412.30')).toBeInTheDocument();
  });

  it('has no Total Trades card, win-rate ring, quick stats or ad', () => {
    renderWithProviders(<DashboardView />);
    expect(screen.queryByText('Total Trades')).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick stats/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-ad-slot]')).toBeNull();
  });

  it('puts the delta in words next to the figure when the previous period is known', () => {
    periodStats.mockReturnValue(period({ prev: { ...stats, totalPnl: 1092.3 }, prevRange: { startDate: '', endDate: '', name: 'Oct', spokenName: 'October' }, canCompare: true }));
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('up $320.00 versus October')).toBeInTheDocument();
  });

  it('shows no delta line when Compare is off or the range is All time', () => {
    renderWithProviders(<DashboardView />);
    expect(screen.queryByText(/versus/)).not.toBeInTheDocument();
  });

  it('writes one line per currency from the server per-currency totals and no combined money figure', () => {
    capital.mockReturnValue({ accounts: [usd, inr], selectedAccountId: null, totalCapital: 500000, accountsReady: true, accountsLoading: false, accountsError: false });
    const mixedStats = {
      ...stats,
      currencies: ['INR', 'USD'],
      byCurrency: {
        USD: { ...stats, totalPnl: 120, totalTrades: 2, wins: 2, profitFactor: null, dailyPnl: [{ date: '2026-11-03', pnl: 120, cumulativePnl: 120 }] },
        INR: { ...stats, totalPnl: -300, totalTrades: 1, wins: 0, profitFactor: 0, dailyPnl: [{ date: '2026-11-03', pnl: -300, cumulativePnl: -300 }] },
      },
    } as unknown as AggregatedStats;
    periodStats.mockReturnValue(period({ stats: mixedStats }));
    renderWithProviders(<DashboardView />);
    expect(screen.getAllByText('+$120.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−₹300.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('+$1,412.30')).not.toBeInTheDocument();
    expect(screen.queryByText('Balance')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'USD' })).toBeInTheDocument();
  });

  it('shows an error panel with Retry when the statistics fail, never the welcome state', async () => {
    const refetch = vi.fn();
    periodStats.mockReturnValue(period({ stats: undefined, isError: true, refetch }));
    renderWithProviders(<DashboardView />);
    expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Couldn't load your statistics.").length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByText('Recent trades')).toBeInTheDocument();
  });

  it('keeps the dashboard when the trade list fails and says what failed', () => {
    scopeTrades.mockReturnValue({ trades: [], isLoading: false, isError: true, truncated: false, refetch: vi.fn() });
    renderWithProviders(<DashboardView />);
    expect(screen.getByText("Couldn't load your trades.")).toBeInTheDocument();
    expect(screen.getByLabelText('Period statistics')).toBeInTheDocument();
  });

  it('shows the API message of a failed trade list, statistics and accounts load', () => {
    scopeTrades.mockReturnValue({ trades: [], isLoading: false, isError: true, error: { status: 500, data: { message: 'Trades are unavailable right now.' } }, truncated: false, refetch: vi.fn() });
    periodStats.mockReturnValue(period({ isError: true, error: { status: 400, data: { message: 'The period is too long.' } } }));
    const { unmount } = renderWithProviders(<DashboardView />);
    expect(screen.getByText('Trades are unavailable right now.')).toBeInTheDocument();
    expect(screen.getAllByText('The period is too long.').length).toBeGreaterThan(0);
    expect(screen.queryByText(/internet connection/i)).toBeNull();
    unmount();

    capital.mockReturnValue({ accounts: [], selectedAccountId: null, totalCapital: 0, accountsReady: false, accountsLoading: false, accountsError: true, accountsErrorDetail: { status: 503, data: { message: 'Accounts are unavailable.' } } });
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('Accounts are unavailable.')).toBeInTheDocument();
  });

  it('says to check the connection only when no response came back', () => {
    scopeTrades.mockReturnValue({ trades: [], isLoading: false, isError: true, error: { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }, truncated: false, refetch: vi.fn() });
    renderWithProviders(<DashboardView />);
    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
  });

  it('shows the first-run page when there is no account yet', () => {
    capital.mockReturnValue({ accounts: [], selectedAccountId: null, totalCapital: 0, accountsReady: false, accountsLoading: false, accountsError: false });
    renderWithProviders(<DashboardView />);
    expect(screen.getByLabelText('First run')).toBeInTheDocument();
  });

  it('does not flash the first-run page while accounts load', () => {
    capital.mockReturnValue({ accounts: [], selectedAccountId: null, totalCapital: 0, accountsReady: false, accountsLoading: true, accountsError: false });
    scopeTrades.mockReturnValue({ trades: [], isLoading: true, isError: false, truncated: false, refetch: vi.fn() });
    periodStats.mockReturnValue(period({ stats: undefined, isLoading: true, accountsReady: false }));
    renderWithProviders(<DashboardView />);
    expect(screen.queryByLabelText('First run')).not.toBeInTheDocument();
  });

  it('shows the first-run page when the whole journal has no trades', () => {
    scopeTrades.mockReturnValue({ trades: [], isLoading: false, isError: false, truncated: false, refetch: vi.fn() });
    periodStats.mockReturnValue(period({ stats: { ...stats, totalTrades: 0 } }));
    renderWithProviders(<DashboardView />, { preloadedState: { trades: { filters: { accountId: 'ALL', startDate: '2000-01-01', endDate: '2026-11-11', datePreset: 'all' } } } });
    expect(screen.getByLabelText('First run')).toBeInTheDocument();
  });

  it('keeps the whole page when a period has no trades: strip with dashes, Today strip, goals and the Show all time action in each region', async () => {
    scopeTrades.mockReturnValue({ trades: [], isLoading: false, isError: false, truncated: false, refetch: vi.fn() });
    periodStats.mockReturnValue(period({ stats: { ...stats, totalTrades: 0 } }));
    renderWithProviders(<DashboardView />, { preloadedState: { trades: { filters: { accountId: 'ALL', startDate: '2026-11-01', endDate: '2026-11-11', datePreset: 'thisMonth' } } } });
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByLabelText('Period statistics').querySelectorAll('dd')).toHaveLength(5);
    expect(screen.getByLabelText('Period statistics')).toHaveTextContent('—');
    expect(screen.getByText('Recent trades')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getAllByText('No trades in this period.').length).toBe(3);
    expect(screen.queryByLabelText('First run')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Show all time' }).length).toBe(2);
  });

  it('shows the ceiling note on Needs attention when the loaded scope is capped', () => {
    scopeTrades.mockReturnValue({ trades: [t('1', 'a', 5)], isLoading: false, isError: false, truncated: true, refetch: vi.fn() });
    renderWithProviders(<DashboardView />);
    expect(screen.getByText('From the newest 5,000 trades')).toBeInTheDocument();
  });
});
