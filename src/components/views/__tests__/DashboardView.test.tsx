import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders as render, screen, fireEvent, act } from '@/test/test-utils';
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

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
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
  useGetTradesPaginatedQuery: vi.fn(() => ({
    data: { trades: [], pagination: { nextCursor: null, hasMore: false, limit: 5 } },
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
  useGetAccountsQuery: vi.fn(() => ({
    data: {
      accounts: [
        { id: '1', name: 'Account 1', initialBalance: 10000, balance: 10500 },
      ],
    },
    isLoading: false,
  })),
}));

// Mock skipToken
vi.mock('@reduxjs/toolkit/query/react', async () => {
  const actual = await vi.importActual('@reduxjs/toolkit/query/react');
  return { ...actual, skipToken: Symbol('skipToken') };
});

import { useGetTradesPaginatedQuery, useGetStatsQuery } from '@/store/api';

const mockOnAddTrade = vi.fn();
const mockOnImportTrades = vi.fn();

const pagination = { nextCursor: null, hasMore: false, limit: 5 };

function mockPaginatedTrades(trades: any[], overrides: any = {}) {
  return {
    data: { trades, pagination },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as any;
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      {
        id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
        exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
        entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
      },
    ]));
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
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([], { isLoading: true }));

    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);

    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });
});

describe('DashboardView - Refresh & Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([]));
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
    const buttons = screen.getAllByRole('button');
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
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      {
        id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
        exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
        entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
      },
    ]));
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
    expect(screen.getByText('+1250.50')).toBeInTheDocument();
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
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([], { isLoading: true }));
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    expect(screen.queryByTestId('performance-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-stats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trade-list')).not.toBeInTheDocument();
  });

  it('shows skeletons when isFetching is true', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([], { isLoading: false, isFetching: true }));
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });
});

describe('DashboardView - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const emptyStatsData = {
    totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
    avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
    maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
    grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
    totalVolume: 0, dailyPnl: [],
  };

  it('shows welcome empty state when no trades with default all filter', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStatsData, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByText('Welcome to TradeQut!')).toBeInTheDocument();
    expect(screen.getByText(/Start by adding your first trade/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Your First Trade/ })).toBeInTheDocument();
  });

  it('calls onAddTrade from period empty state Add Trade button', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStatsData, isLoading: false, isFetching: false } as any);

    const onAddTrade = vi.fn();
    render(<DashboardView onAddTrade={onAddTrade} onImportTrades={vi.fn()} />);

    const addButtons = screen.getAllByRole('button', { name: /Add Trade/ });
    fireEvent.click(addButtons[addButtons.length - 1]);
    expect(onAddTrade).toHaveBeenCalled();
  });

  it('shows Import Trades button in welcome empty state', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStatsData, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Import Trades/ })).toBeInTheDocument();
  });

  it('does not show empty state when trades exist', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      {
        id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
        exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
        entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
      },
    ]));
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

    expect(screen.queryByText('Welcome to TradeQut!')).not.toBeInTheDocument();
  });

  it('does not show empty state while loading', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([], { isLoading: true }));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: undefined, isLoading: true, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryByText('Welcome to TradeQut!')).not.toBeInTheDocument();
  });
});

describe('DashboardView - Debounced Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      {
        id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
        exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
        entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
        outcome: 'TP', pnl: 200, riskRewardRatio: 2.0, accountId: 'acc1',
      },
    ]));
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces filter changes before firing API calls', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    const initialTradesCallCount = vi.mocked(useGetTradesPaginatedQuery).mock.calls.length;
    const initialStatsCallCount = vi.mocked(useGetStatsQuery).mock.calls.length;

    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
    expect(initialTradesCallCount).toBeGreaterThan(0);
    expect(initialStatsCallCount).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });

  it('renders correctly after debounce timer completes', () => {
    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getAllByTestId('stat-card')).toHaveLength(4);
    expect(screen.getByTestId('trade-list')).toBeInTheDocument();
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
  });
});

describe('DashboardView - Unmapped Trades Banner', () => {
  const baseTrade = {
    id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
    exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
    entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
    outcome: 'TP', pnl: 200, riskRewardRatio: 2.0,
  };

  const baseStats = {
    totalPnl: 600, winRate: 100, totalTrades: 3, wins: 3, losses: 0, breakeven: 0,
    avgWin: 200, avgLoss: 0, profitFactor: Infinity, bestTrade: 200, worstTrade: 0,
    maxDrawdown: 0, avgRiskReward: 2.0, consecutiveWins: 3, consecutiveLosses: 0,
    grossProfit: 600, grossLoss: 0, expectancy: 200, sharpeRatio: 0, avgHoldingTime: 0,
    totalVolume: 3, dailyPnl: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unmapped banner when some trades lack accountId', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      { ...baseTrade, id: '1', accountId: 'acc1' },
      { ...baseTrade, id: '2', accountId: 'acc1' },
      { ...baseTrade, id: '3' }, // no accountId -> unmapped
    ]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: baseStats, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByText('Some trades are not mapped to any account and are excluded from stats.')).toBeInTheDocument();
  });

  it('does not show banner when all trades are mapped', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      { ...baseTrade, id: '1', accountId: 'acc1' },
      { ...baseTrade, id: '2', accountId: 'acc1' },
    ]));
    vi.mocked(useGetStatsQuery).mockReturnValue({
      data: { ...baseStats, totalTrades: 2, totalPnl: 400 },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryByText(/not mapped/)).not.toBeInTheDocument();
  });

  it('does not show banner during loading', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades(
      [{ ...baseTrade, id: '1' }],
      { isLoading: true },
    ));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: undefined, isLoading: true, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.queryByText(/not mapped/)).not.toBeInTheDocument();
  });
});

describe('DashboardView - Unmapped Trades Empty State', () => {
  const baseTrade = {
    id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
    exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
    entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
    outcome: 'TP', pnl: 200, riskRewardRatio: 2.0,
  };

  const emptyStats = {
    totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
    avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
    maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
    grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
    totalVolume: 0, dailyPnl: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unmapped empty state instead of welcome when all trades are unmapped', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      { ...baseTrade, id: '1' }, // no accountId -> unmapped
      { ...baseTrade, id: '2' }, // no accountId -> unmapped
    ]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStats, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByText('Unmapped trades found')).toBeInTheDocument();
    expect(screen.getByText(/aren't assigned to any account/)).toBeInTheDocument();
    expect(screen.queryByText('Welcome to TradeQut!')).not.toBeInTheDocument();
  });

  it('shows Go to Trade Log button that navigates correctly', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      { ...baseTrade, id: '1' },
    ]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStats, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    const tradeLogBtn = screen.getByRole('button', { name: /Go to Trade Log/ });
    fireEvent.click(tradeLogBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/app/tradelog');
  });

  it('still shows Add Trade button in unmapped empty state', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([
      { ...baseTrade, id: '1' },
    ]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStats, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    const addButtons = screen.getAllByRole('button', { name: /Add Trade/ });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows welcome state when truly no trades exist', () => {
    vi.mocked(useGetTradesPaginatedQuery).mockReturnValue(mockPaginatedTrades([]));
    vi.mocked(useGetStatsQuery).mockReturnValue({ data: emptyStats, isLoading: false, isFetching: false } as any);

    render(<DashboardView onAddTrade={vi.fn()} onImportTrades={vi.fn()} />);

    expect(screen.getByText('Welcome to TradeQut!')).toBeInTheDocument();
    expect(screen.queryByText(/unmapped trade/i)).not.toBeInTheDocument();
  });
});
