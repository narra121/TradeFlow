import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { AnalyticsView } from '../AnalyticsView';

// Mock Radix UI Tooltip for RefreshButton
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

// Mock recharts - it doesn't work in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Scatter: () => <div />,
  ZAxis: () => <div />,
  Area: () => <div />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock RTK Query hooks
vi.mock('@/store/api', () => ({
  useGetStatsQuery: vi.fn().mockReturnValue({
    data: {
      totalPnl: 200, winRate: 100, totalTrades: 1, wins: 1, losses: 0, breakeven: 0,
      avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
      maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 1, consecutiveLosses: 0,
      grossProfit: 200, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 14400,
      totalVolume: 1, minDuration: 14400, maxDuration: 14400,
      durationBuckets: [], symbolDistribution: { EURUSD: { count: 1, wins: 1, pnl: 200 } },
      strategyDistribution: { Breakout: { count: 1, wins: 1, pnl: 200 } },
      sessionDistribution: { 'London Open': { count: 1, wins: 1, pnl: 200 } },
      outcomeDistribution: { TP: 1 }, hourlyStats: [], dailyWinRate: [], dailyPnl: [],
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useGetSavedOptionsQuery: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    isFetching: false,
  }),
  useUpdateSavedOptionsMutation: vi.fn().mockReturnValue([
    vi.fn(),
    { isLoading: false },
  ]),
  useGetRulesAndGoalsQuery: vi.fn().mockReturnValue({
    data: { rules: [], goals: [] },
    isLoading: false,
    isFetching: false,
  }),
  useGetAccountsQuery: vi.fn().mockReturnValue({
    data: {
      accounts: [
        { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
      ],
    },
    isLoading: false,
    isFetching: false,
  }),
}));

// Mock custom hooks
vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: vi.fn().mockReturnValue({
    options: {
      symbols: [],
      strategies: ['Breakout'],
      sessions: ['London Open', 'NY Open'],
      marketConditions: [],
      newsEvents: [],
      mistakes: [],
      lessons: [],
      timeframes: [],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn().mockReturnValue({
    accounts: [
      { id: 'acc1', name: 'Main Account', initialBalance: 10000 },
    ],
    selectedAccountId: null,
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
  }),
}));

// Mock child components
vi.mock('@/components/dashboard/PerformanceChart', () => ({
  PerformanceChart: () => <div data-testid="performance-chart">Performance Chart</div>,
}));
vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">Account Filter</div>,
}));
vi.mock('@/components/filters/DateRangeFilter', () => ({
  DateRangeFilter: () => <div data-testid="date-range-filter">Date Range Filter</div>,
  getDateRangeFromPreset: vi.fn().mockReturnValue({ from: new Date('2025-01-01'), to: new Date('2025-01-31') }),
}));
vi.mock('@/components/ui/loading-skeleton', () => ({
  MetricsGridSkeleton: () => <div data-testid="metrics-skeleton" />,
  ChartSkeleton: () => <div data-testid="chart-skeleton" />,
}));

describe('AnalyticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Identify patterns and optimize your strategy')).toBeInTheDocument();
  });

  it('renders the account filter', () => {
    render(<AnalyticsView />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
  });

  it('renders the date range filter', () => {
    render(<AnalyticsView />);
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });

  it('renders the metrics grid section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getAllByText('Win Rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
  });

  it('renders the equity curve section', () => {
    render(<AnalyticsView />);
    // With only 1 trade (< MIN_TRADES_FOR_CHARTS=3), the chart empty state is shown
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
  });

  it('renders the Daily P&L chart section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Daily P&L')).toBeInTheDocument();
  });

  it('renders the Hourly Win Rate section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Hourly Win Rate')).toBeInTheDocument();
  });

  it('renders the Daily Win Rate section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Daily Win Rate')).toBeInTheDocument();
  });

  it('renders the Symbol Distribution section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Symbol Distribution')).toBeInTheDocument();
  });

  it('renders the Strategy Distribution section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Strategy Distribution')).toBeInTheDocument();
  });

  it('renders the Performance by Session section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Performance by Session')).toBeInTheDocument();
  });

  it('renders the Trade Duration section', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Trade Duration (Time to TP/SL)')).toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', async () => {
    const { useGetStatsQuery } = await import('@/store/api');
    (useGetStatsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AnalyticsView />);
    expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
  });
});

describe('AnalyticsView - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no trade data exists', async () => {
    const { useGetStatsQuery } = await import('@/store/api');
    (useGetStatsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
        grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 0, minDuration: 0, maxDuration: 0,
        durationBuckets: [], symbolDistribution: {}, strategyDistribution: {},
        sessionDistribution: {}, outcomeDistribution: {}, hourlyStats: [],
        dailyWinRate: [], dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AnalyticsView />);

    expect(screen.getByText('No analytics data yet')).toBeInTheDocument();
    expect(screen.getByText(/Head to the Dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Dashboard/ })).toBeInTheDocument();
  });

  it('does not show empty state when trades exist', async () => {
    const { useGetStatsQuery } = await import('@/store/api');
    (useGetStatsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        totalPnl: 200, winRate: 100, totalTrades: 1, wins: 1, losses: 0, breakeven: 0,
        avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 1, consecutiveLosses: 0,
        grossProfit: 200, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 14400,
        totalVolume: 1, minDuration: 14400, maxDuration: 14400,
        durationBuckets: [], symbolDistribution: { EURUSD: { count: 1, wins: 1, pnl: 200 } },
        strategyDistribution: { Breakout: { count: 1, wins: 1, pnl: 200 } },
        sessionDistribution: { 'London Open': { count: 1, wins: 1, pnl: 200 } },
        outcomeDistribution: { TP: 1 }, hourlyStats: [], dailyWinRate: [], dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AnalyticsView />);

    expect(screen.queryByText('No analytics data yet')).not.toBeInTheDocument();
  });
});

describe('AnalyticsView - Insights Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Top Mistakes" section heading', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Top Mistakes')).toBeInTheDocument();
  });

  it('renders "Broken Rules" section heading', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
  });

  it('renders "Key Lessons" section heading', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('Key Lessons')).toBeInTheDocument();
  });

  it('shows empty state text when no mistakes data', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('No mistakes recorded yet')).toBeInTheDocument();
  });

  it('shows empty state text when no lessons data', () => {
    render(<AnalyticsView />);
    expect(screen.getByText('No lessons recorded yet')).toBeInTheDocument();
  });

  it('shows mistake entries when mistakesDistribution has data', async () => {
    const { useGetStatsQuery } = await import('@/store/api');
    (useGetStatsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        totalPnl: 200, winRate: 100, totalTrades: 1, wins: 1, losses: 0, breakeven: 0,
        avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 1, consecutiveLosses: 0,
        grossProfit: 200, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 14400,
        totalVolume: 1, minDuration: 14400, maxDuration: 14400,
        durationBuckets: [], symbolDistribution: { EURUSD: { count: 1, wins: 1, pnl: 200 } },
        strategyDistribution: { Breakout: { count: 1, wins: 1, pnl: 200 } },
        sessionDistribution: { 'London Open': { count: 1, wins: 1, pnl: 200 } },
        outcomeDistribution: { TP: 1 }, hourlyStats: [], dailyWinRate: [], dailyPnl: [],
        mistakesDistribution: { 'FOMO': { count: 3, totalPnl: -150 } },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AnalyticsView />);
    expect(screen.getByText('FOMO')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
