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
const entitlements = vi.fn();
const taxReport = vi.fn();

vi.mock('@/components/shell/chrome', () => ({ ScopeBarSlot: ({ children, side }: { children: React.ReactNode; side: string }) => <div data-testid={`slot-${side}`}>{children}</div>, usePageChrome: () => undefined }));
let mobile = false;
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/components/stats/usePeriodStats', () => ({ usePeriodStats: (o: unknown) => periodStats(o) }));
const capital = vi.fn();
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => capital() }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => entitlements() }));
vi.mock('@/store/api/statsApi', () => ({ useGetTaxReportQuery: (...a: unknown[]) => taxReport(...a) }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openNew: vi.fn() }) }));
vi.mock('@/store/api', () => ({ useGetRulesQuery: () => ({ data: [{ ruleId: 'r1', rule: 'No revenge trades' }] }) }));
const analysis = vi.fn();
vi.mock('@/components/analysis/useAnalysis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/analysis/useAnalysis')>()),
  useAnalysis: () => analysis(),
}));

import { AnalyticsView } from '../AnalyticsView';
import { QA_USD } from '@/components/analysis/__tests__/qaFixtures';

const analysisScope = { accountId: 'ALL', from: '2026-08-01', to: '2026-11-13' };

const stats = {
  totalTrades: 45, wins: 24, losses: 21, winRate: 53.3, totalPnl: 1108.72, expectancy: 24.64, profitFactor: 1.9, avgWin: 97.64, avgLoss: 58.79, bestTrade: 375, worstTrade: -420,
  avgRiskReward: 2, maxDrawdown: 0.6, consecutiveWins: 5, consecutiveLosses: 7,
  segments: {
    symbol: { NAS100: { trades: 30, wins: 16, net: 900, avgR: null }, GBPJPY: { trades: 15, wins: 8, net: 208.72, avgR: null } },
    strategy: { Reversal: { trades: 6, wins: 5, net: 844.79, avgR: null } },
    weekday: {}, hour: {}, session: {},
  },
  rDistribution: { buckets: [{ label: '0..1', count: 4 }], noStop: 1 },
  timeZone: 'Asia/Kolkata', durationBuckets: [], dailyPnl: [],
  mistakesDistribution: { 'Late Entry': { count: 7, totalPnl: -298.93 } },
  brokenRulesDistribution: { r1: { count: 3, totalPnl: -120 } },
} as unknown as AggregatedStats;

const ready = (over: Record<string, unknown> = {}) => ({
  stats, prev: undefined, prevRange: null, canCompare: false, isLoading: false, isError: false, refetch: vi.fn(), accountsReady: true, ...over,
});

beforeEach(() => {
  mobile = false;
  capital.mockReset().mockReturnValue({ accounts: [{ id: 'a', currency: 'USD' }, { id: 'b', currency: 'INR' }], selectedAccountId: null, totalCapital: 0, accountsReady: true, accountsLoading: false, accountsError: false });
  periodStats.mockReset().mockReturnValue(ready());
  entitlements.mockReset().mockReturnValue({ isLoading: false, isError: false, can: () => true, currency: 'USD' });
  taxReport.mockReset().mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
  analysis.mockReset().mockReturnValue({ data: QA_USD, scope: analysisScope, isLoading: false, isError: false, mixed: null, refetch: vi.fn() });
});

describe('AnalyticsView', () => {
  it('puts Compare in the scope bar on a desktop, and in the page on a phone (the bar has no room beside the period)', () => {
    periodStats.mockReturnValue(ready({ canCompare: true }));
    const { unmount } = renderWithProviders(<AnalyticsView />, { route: '/app/analytics' });
    expect(screen.getByTestId('slot-right')).toContainElement(screen.getByRole('switch', { name: 'Compare: previous period' }));
    unmount();
    mobile = true;
    renderWithProviders(<AnalyticsView />, { route: '/app/analytics' });
    expect(screen.getByRole('switch', { name: 'Compare: previous period' })).toBeInTheDocument();
    expect(screen.queryByTestId('slot-right')).toBeNull();
  });

  it('renders the tabs as links with the current one marked, Tax as Planned', () => {
    renderWithProviders(<AnalyticsView />, { route: '/app/analytics' });
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('What is working · what is not')).toBeInTheDocument();
  });

  it('shows an error with Retry, not the "add trades" empty state, when the accounts fail to load', () => {
    capital.mockReturnValue({ accounts: [], selectedAccountId: null, totalCapital: 0, accountsReady: false, accountsLoading: false, accountsError: true, accountsErrorDetail: { status: 500, data: { message: 'Internal error' } } });
    periodStats.mockReturnValue(ready({ stats: undefined, isLoading: false, accountsReady: false }));
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByText("Couldn't load your accounts.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByText('Add at least 3 trades to see analytics.')).not.toBeInTheDocument();
  });

  it('shows the empty state, not a skeleton, when the user has no account yet', () => {
    capital.mockReturnValue({ accounts: [], selectedAccountId: null, totalCapital: 0, accountsReady: false, accountsLoading: false, accountsError: false });
    periodStats.mockReturnValue(ready({ stats: undefined, isLoading: false, accountsReady: false }));
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByText('Add at least 3 trades to see analytics.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add trade' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading analytics')).not.toBeInTheDocument();
  });

  it('asks for at least three trades with the next steps', () => {
    periodStats.mockReturnValue(ready({ stats: { ...stats, totalTrades: 2 } }));
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByText('Add at least 3 trades to see analytics.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add trade' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/app/import');
  });

  it('shows a per-tab error with Retry, never zeros', async () => {
    const refetch = vi.fn();
    periodStats.mockReturnValue(ready({ stats: undefined, isError: true, refetch }));
    renderWithProviders(<AnalyticsView />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByText("Couldn't load this tab.")).toBeInTheDocument();
  });

  it('shows the API message of a failed tab; the connection message only without a response', () => {
    periodStats.mockReturnValue(ready({ stats: undefined, isError: true, error: { status: 500, data: { message: 'Statistics are being rebuilt.' } } }));
    const { unmount } = renderWithProviders(<AnalyticsView />);
    expect(screen.getByRole('alert')).toHaveTextContent('Statistics are being rebuilt.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    periodStats.mockReturnValue(ready({ stats: undefined, isError: true, error: { status: 'TIMEOUT_ERROR' } }));
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByRole('alert')).toHaveTextContent(/timed out/i);
  });

  it('shows a loading skeleton while the statistics load', () => {
    periodStats.mockReturnValue(ready({ stats: undefined, isLoading: true }));
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByLabelText('Loading analytics')).toBeInTheDocument();
  });

  it('shows one currency at a time when the scope mixes currencies, with a switch, never a combined figure', async () => {
    const mixedStats = { ...stats, totalTrades: 45, currencies: ['INR', 'USD'], byCurrency: { INR: { ...stats, totalPnl: -5000, totalTrades: 20 }, USD: { ...stats, totalPnl: 1108.72, totalTrades: 25 } } } as unknown as AggregatedStats;
    periodStats.mockReturnValue(ready({ stats: mixedStats }));
    analysis.mockReturnValue({ data: undefined, scope: analysisScope, isLoading: false, isError: false, mixed: ['INR', 'USD'], refetch: vi.fn() });
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByRole('radio', { name: 'USD' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('+$1,108.72')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'INR' }));
    expect(screen.getByText('−₹5,000.00')).toBeInTheDocument();
    expect(screen.queryByText(/Totals are per currency/)).not.toBeInTheDocument();
  });

  it('puts the currency switch in the scope bar on a desktop and in the page on a phone', () => {
    const mixedStats = { ...stats, currencies: ['INR', 'USD'], byCurrency: { INR: { ...stats, totalTrades: 20 }, USD: { ...stats, totalTrades: 25 } } } as unknown as AggregatedStats;
    periodStats.mockReturnValue(ready({ stats: mixedStats }));
    analysis.mockReturnValue({ data: undefined, scope: analysisScope, isLoading: false, isError: false, mixed: ['INR', 'USD'], refetch: vi.fn() });
    const { unmount } = renderWithProviders(<AnalyticsView />);
    expect(screen.getByTestId('slot-left')).toContainElement(screen.getByRole('radio', { name: 'USD' }));
    unmount();
    mobile = true;
    renderWithProviders(<AnalyticsView />);
    expect(screen.getByRole('radio', { name: 'USD' })).toBeInTheDocument();
    expect(screen.queryByTestId('slot-left')).toBeNull();
  });

  describe('without advanced analytics', () => {
    beforeEach(() => entitlements.mockReturnValue({ isLoading: false, isError: false, can: () => false, currency: 'INR' }));

    it('replaces Timing with a locked preview and does not request its data', () => {
      renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=timing' });
      expect(screen.getByTestId('locked-preview')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upgrade/ })).toBeInTheDocument();
      expect(periodStats).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    });

    it('locks every Group by value except Symbol, with the preview in the billing currency rather than a dialog', () => {
      const { unmount } = renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=edge&by=strategy' });
      expect(screen.getByTestId('locked-preview')).toHaveTextContent('Group by Strategy');
      expect(screen.getByTestId('locked-preview')).toHaveTextContent('₹');
      unmount();
      renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=edge' });
      expect(screen.queryByTestId('locked-preview')).not.toBeInTheDocument();
      expect(screen.getByRole('row', { name: /NAS100/ })).toBeInTheDocument();
    });

    it('keeps mistake and rule counts but hides their cost behind Pro', () => {
      renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=behaviour' });
      expect(screen.getByText('Late Entry')).toBeInTheDocument();
      expect(screen.getByText('No revenge trades')).toBeInTheDocument();
      expect(screen.queryByText('−$298.93')).not.toBeInTheDocument();
      expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
    });

    it('limits "what is working" to symbols', () => {
      renderWithProviders(<AnalyticsView />);
      expect(screen.getByText(/results by symbol only/)).toBeInTheDocument();
      expect(screen.queryByText(/Reversal/)).not.toBeInTheDocument();
    });
  });

  it('does not request statistics on the Tax tab', () => {
    renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=tax' });
    expect(screen.getByText('Financial year')).toBeInTheDocument();
    expect(periodStats).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('names the weekday × hour zone on Timing for Pro users', () => {
    renderWithProviders(<AnalyticsView />, { route: '/app/analytics?tab=timing' });
    expect(screen.getByText('Times in Asia/Kolkata')).toBeInTheDocument();
  });
});
