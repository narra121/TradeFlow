import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen, fireEvent } from '@/test/test-utils';
import { DashboardView } from '../DashboardView';

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

// --- Mock child components to isolate unit tests ---
vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({ title, value }: any) => (
    <div data-testid="stat-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@/components/dashboard/TradeList', () => ({
  TradeList: ({ trades }: any) => (
    <div data-testid="trade-list">TradeList ({trades?.length ?? 0} trades)</div>
  ),
}));

vi.mock('@/components/dashboard/PerformanceChart', () => ({
  PerformanceChart: () => <div data-testid="performance-chart">PerformanceChart</div>,
}));

vi.mock('@/components/dashboard/WinRateRing', () => ({
  WinRateRing: () => <div data-testid="win-rate-ring">WinRateRing</div>,
}));

vi.mock('@/components/dashboard/QuickStats', () => ({
  QuickStats: () => <div data-testid="quick-stats">QuickStats</div>,
}));

vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">AccountFilter</div>,
}));

vi.mock('@/components/filters/DateRangeFilter', () => ({
  DateRangeFilter: () => <div data-testid="date-range-filter">DateRangeFilter</div>,
  getDateRangeFromPreset: vi.fn(() => ({ from: new Date(), to: new Date() })),
}));

// Mock API hooks
vi.mock('@/store/api', () => ({
  useGetTradesQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
  useGetStatsQuery: vi.fn(() => ({
    data: {
      totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
      avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
      maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
      grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
      totalVolume: 0, dailyPnl: [],
    },
    isLoading: false,
    isFetching: false,
  })),
}));

// Mock the useAccounts hook
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    selectedAccountId: null,
    accounts: [
      { id: '1', name: 'Account 1', initialBalance: 10000, balance: 10500 },
    ],
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    updateAccountStatus: vi.fn(),
  })),
}));

import { useGetTradesQuery, useGetStatsQuery } from '@/store/api';

const mockOnAddTrade = vi.fn();
const mockOnImportTrades = vi.fn();

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 200, winRate: 100, totalTrades: 1, wins: 1, losses: 0, breakeven: 0,
        avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 1, consecutiveLosses: 0,
        grossProfit: 200, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 1, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);
  });

  it('renders without crashing', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });

  it('shows dashboard heading and description', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Your trading performance at a glance')).toBeInTheDocument();
  });

  it('shows stat cards area', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards.length).toBe(4);
    // Verify key stat titles
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Trades')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
  });

  it('shows trade list and chart area', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('trade-list')).toBeInTheDocument();
    expect(screen.getByTestId('win-rate-ring')).toBeInTheDocument();
    expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
  });

  it('shows Add Trade and Import buttons', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    expect(screen.getByRole('button', { name: /add trade/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when trades are loading', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);

    // When loading, stat cards should not render (skeletons shown instead)
    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    // Heading should still appear
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });
});

describe('DashboardView - Refresh & Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
        grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 0, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);
  });

  it('renders the refresh button', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    // RefreshButton renders a button inside the header area
    const buttons = screen.getAllByRole('button');
    // At least the refresh button, Import, and Add Trade should exist
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the account filter component', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
  });

  it('renders the date range filter component', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });
});

describe('DashboardView - Stat Cards With Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 1250.50, winRate: 72.5, totalTrades: 40, wins: 29, losses: 11, breakeven: 0,
        avgWin: 150, avgLoss: -80, profitFactor: 2.35, bestTrade: 500, worstTrade: -200,
        maxDrawdown: 5.2, avgRiskReward: 1.8, consecutiveWins: 5, consecutiveLosses: 2,
        grossProfit: 4350, grossLoss: -1850, expectancy: 31.26, sharpeRatio: 1.2, avgHoldingTime: 120,
        totalVolume: 50, dailyPnl: [{ date: '2025-01-15', pnl: 200, cumulativePnl: 200 }],
      },
      isLoading: false,
      isFetching: false,
    } as any);
  });

  it('shows stat cards with correct values when data is loaded', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards).toHaveLength(4);

    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('1250.50')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('Total Trades')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
    expect(screen.getByText('2.35')).toBeInTheDocument();
  });

  it('renders performance chart section when data is loaded', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
  });

  it('renders quick stats section when data is loaded', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
  });

  it('renders win rate ring when data is loaded', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('win-rate-ring')).toBeInTheDocument();
  });

  it('renders trade list when data is loaded', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);
    expect(screen.getByTestId('trade-list')).toBeInTheDocument();
  });
});

describe('DashboardView - Loading Skeletons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides performance chart and quick stats during fetch', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    // Stat cards should not be present when loading
    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    // Performance chart should not render while loading
    expect(screen.queryByTestId('performance-chart')).not.toBeInTheDocument();
    // Quick stats should not render while loading
    expect(screen.queryByTestId('quick-stats')).not.toBeInTheDocument();
    // Trade list should not render while loading
    expect(screen.queryByTestId('trade-list')).not.toBeInTheDocument();
  });

  it('shows skeletons when isFetching is true', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: true,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    // When isFetching, loading skeletons should be shown (stat cards hidden)
    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    // Heading should still appear
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });
});

describe('DashboardView - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows period empty state when no trades in current filter', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
        grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 0, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);

    // Default filter is 'thisWeek', not 'all', so shows period empty state
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByText('No trades in this period')).toBeInTheDocument();
    expect(screen.getByText(/Try selecting a different date range/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View All Time/ })).toBeInTheDocument();
  });

  it('calls onAddTrade from period empty state Add Trade button', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
        grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 0, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);

    const onAddTrade = vi.fn();
    render(<DashboardView onAddTrade={onAddTrade} onImportTrades={vi.fn()} />);

    // Period empty state has "Add Trade" button (header also has one)
    const addButtons = screen.getAllByRole('button', { name: /Add Trade/ });
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(onAddTrade).toHaveBeenCalled();
  });

  it('shows View All Time button in period empty state', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
        grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 0, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByRole('button', { name: /View All Time/ })).toBeInTheDocument();
  });

  it('does not show empty state when trades exist', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: {
        totalPnl: 200, winRate: 100, totalTrades: 1, wins: 1, losses: 0, breakeven: 0,
        avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
        maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 1, consecutiveLosses: 0,
        grossProfit: 200, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 0,
        totalVolume: 1, dailyPnl: [],
      },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryByText('Welcome to TradeFlow!')).not.toBeInTheDocument();
  });

  it('does not show empty state while loading', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryByText('Welcome to TradeFlow!')).not.toBeInTheDocument();
  });
});
