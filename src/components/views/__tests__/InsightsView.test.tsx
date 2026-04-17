import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { InsightsView } from '../InsightsView';

// Mock Radix UI Tooltip
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <>{children}</>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// Mock RTK Query hooks
vi.mock('@/store/api', () => ({
  useGetStatsQuery: vi.fn(),
  useGetSubscriptionQuery: vi.fn(),
}));

// Mock useAccounts
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(),
}));

// Mock child components
vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">Account Filter</div>,
}));

vi.mock('@/components/filters/DateRangeFilter', () => ({
  DateRangeFilter: () => <div data-testid="date-range-filter">Date Range Filter</div>,
  getDateRangeFromPreset: vi.fn().mockReturnValue({ from: new Date('2026-03-01'), to: new Date('2026-04-17') }),
}));

// Mock insights child components
vi.mock('@/components/insights', () => ({
  ProfileScoreCard: ({ profile }: any) => <div data-testid="profile-score-card">{profile.typeLabel}</div>,
  BehavioralScores: ({ scores }: any) => <div data-testid="behavioral-scores">{scores.length} scores</div>,
  InsightCard: ({ insight }: any) => <div data-testid="insight-card">{insight.title}</div>,
  TradeSpotlight: ({ spotlight }: any) => <div data-testid="trade-spotlight">{spotlight.symbol}</div>,
  InsightsSummary: ({ summary }: any) => <div data-testid="insights-summary">{summary}</div>,
}));

// Mock insights API
vi.mock('@/lib/api/insights', () => ({
  insightsApi: {
    generateInsights: vi.fn(),
  },
}));

// Mock handleApiError
vi.mock('@/lib/api/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  handleApiError: vi.fn().mockReturnValue('Something went wrong'),
}));

// Mock formatDistanceToNow
vi.mock('date-fns/formatDistanceToNow', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('5 minutes ago'),
}));

// Import mocked modules for per-test overrides
import { useGetStatsQuery, useGetSubscriptionQuery } from '@/store/api';
import { useAccounts } from '@/hooks/useAccounts';
import { insightsApi } from '@/lib/api/insights';

// ── Default mock return values ──────────────────────────────────────

const defaultStatsData = {
  totalPnl: 500, winRate: 60, totalTrades: 25, wins: 15, losses: 10, breakeven: 0,
  avgWin: 100, avgLoss: -50, profitFactor: 2.0, bestTrade: 300, worstTrade: -100,
  maxDrawdown: 5, avgRiskReward: 1.5, consecutiveWins: 3, consecutiveLosses: 2,
  grossProfit: 1500, grossLoss: -500, expectancy: 40, sharpeRatio: 1.0, avgHoldingTime: 7200,
  totalVolume: 25, minDuration: 3600, maxDuration: 14400,
  durationBuckets: [], symbolDistribution: {}, strategyDistribution: {},
  sessionDistribution: {}, outcomeDistribution: {}, hourlyStats: [],
  dailyWinRate: [], dailyPnl: [],
};

// ── Sample data ──────────────────────────────────────────────────────

const sampleInsightsResponse = {
  data: {
    profile: { type: 'day_trader', typeLabel: 'Day Trader', aggressivenessScore: 6, aggressivenessLabel: 'Aggressive', trend: null, summary: 'Active day trader' },
    scores: [
      { dimension: 'discipline', value: 75, label: 'Discipline' },
      { dimension: 'risk_management', value: 42, label: 'Risk Management' },
    ],
    insights: [
      { severity: 'critical', title: 'Revenge trading detected', detail: 'Detail text', evidence: 'Evidence text' },
      { severity: 'strength', title: 'Consistent EURUSD strategy', detail: 'Detail text', evidence: 'Evidence text' },
    ],
    tradeSpotlights: [
      { tradeId: 't1', symbol: 'EURUSD', date: '2026-04-10', pnl: -420, reason: 'Oversized position' },
    ],
    summary: 'Overall assessment text',
  },
  meta: { cached: false, generatedAt: '2026-04-17T08:30:00Z', newTradesSince: 0, elapsedMs: 5000 },
};

// ── Tests ────────────────────────────────────────────────────────────

describe('InsightsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: defaultStatsData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'active' },
      isLoading: false,
    } as any);

    vi.mocked(useAccounts).mockReturnValue({
      accounts: [
        { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
      ],
      selectedAccountId: null,
      selectedAccount: null,
      setSelectedAccountId: vi.fn(),
    } as any);
  });

  it('renders page header', () => {
    render(<InsightsView />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('AI-powered analysis of your trading performance')).toBeInTheDocument();
  });

  it('renders filters', () => {
    render(<InsightsView />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });

  it('shows premium gate for free users', () => {
    vi.mocked(useGetSubscriptionQuery).mockReturnValue({
      data: { status: 'free' },
      isLoading: false,
    } as any);

    render(<InsightsView />);
    expect(screen.getByText('AI Insights is a Premium Feature')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
  });

  it('shows "Not Enough Trades" when below threshold', () => {
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: { ...defaultStatsData, totalTrades: 5 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(<InsightsView />);
    expect(screen.getByText('Not Enough Trades')).toBeInTheDocument();
    expect(screen.getByText(/AI Insights needs at least/)).toBeInTheDocument();
  });

  it('shows "Ready to Analyze" with Generate button when premium and enough trades', () => {
    render(<InsightsView />);
    expect(screen.getByText('Ready to Analyze')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Insights/ })).toBeInTheDocument();
  });

  it('calls API on Generate button click', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    expect(insightsApi.generateInsights).toHaveBeenCalledTimes(1);
  });

  it('shows loading state after clicking generate', async () => {
    // Never resolve so loading stays visible
    vi.mocked(insightsApi.generateInsights).mockReturnValue(new Promise(() => {}) as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByText('Analyzing your trades...')).toBeInTheDocument();
    });
  });

  it('renders results after successful API call', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByTestId('insights-summary')).toBeInTheDocument();
      expect(screen.getByTestId('profile-score-card')).toBeInTheDocument();
      expect(screen.getByTestId('behavioral-scores')).toBeInTheDocument();
    });
  });

  it('renders summary', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByTestId('insights-summary')).toBeInTheDocument();
      expect(screen.getByText('Overall assessment text')).toBeInTheDocument();
    });
  });

  it('renders profile card', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByTestId('profile-score-card')).toBeInTheDocument();
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
    });
  });

  it('renders behavioral scores', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByTestId('behavioral-scores')).toBeInTheDocument();
      expect(screen.getByText('2 scores')).toBeInTheDocument();
    });
  });

  it('renders insight cards', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      const insightCards = screen.getAllByTestId('insight-card');
      expect(insightCards).toHaveLength(2);
      expect(screen.getByText('Revenge trading detected')).toBeInTheDocument();
      expect(screen.getByText('Consistent EURUSD strategy')).toBeInTheDocument();
    });
  });

  it('renders trade spotlights', async () => {
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      const spotlights = screen.getAllByTestId('trade-spotlight');
      expect(spotlights).toHaveLength(1);
      expect(screen.getByText('EURUSD')).toBeInTheDocument();
    });
  });

  it('shows cache banner when cached', async () => {
    const cachedResponse = {
      ...sampleInsightsResponse,
      meta: { ...sampleInsightsResponse.meta, cached: true, newTradesSince: 3 },
    };
    vi.mocked(insightsApi.generateInsights).mockResolvedValue(cachedResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
    });
  });

  it('shows error state', async () => {
    vi.mocked(insightsApi.generateInsights).mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<InsightsView />);

    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    });
  });

  it('retry button calls API again', async () => {
    vi.mocked(insightsApi.generateInsights)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(sampleInsightsResponse as any);

    const user = userEvent.setup();
    render(<InsightsView />);

    // First click triggers error
    await user.click(screen.getByRole('button', { name: /Generate Insights/ }));

    await waitFor(() => {
      expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
    });

    // Click retry
    await user.click(screen.getByRole('button', { name: /Retry/ }));

    expect(insightsApi.generateInsights).toHaveBeenCalledTimes(2);
  });
});
