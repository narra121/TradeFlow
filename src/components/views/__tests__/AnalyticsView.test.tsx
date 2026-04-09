import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { AnalyticsView } from '../AnalyticsView';

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
  useGetTradesQuery: vi.fn().mockReturnValue({
    data: [
      {
        id: '1',
        symbol: 'EURUSD',
        direction: 'LONG',
        entryPrice: 1.1,
        exitPrice: 1.12,
        stopLoss: 1.09,
        takeProfit: 1.13,
        size: 1,
        entryDate: '2025-01-15T10:00:00Z',
        exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP',
        pnl: 200,
        pnlPercent: 2.0,
        riskRewardRatio: 2.0,
        accountId: 'acc1',
        strategy: 'Breakout',
        session: 'London Open',
      },
    ],
    isLoading: false,
    isFetching: false,
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
    expect(screen.getByText('Deep dive into your trading performance')).toBeInTheDocument();
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

  it('renders the performance chart section', () => {
    render(<AnalyticsView />);
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
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
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
    });

    render(<AnalyticsView />);
    expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
  });
});
