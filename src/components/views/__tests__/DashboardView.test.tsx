import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { DashboardView } from '../DashboardView';

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

import { useGetTradesQuery } from '@/store/api';

const mockOnAddTrade = vi.fn();
const mockOnImportTrades = vi.fn();

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
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
    expect(screen.getByText('Track your trading performance')).toBeInTheDocument();
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

  it('shows New Trade and Import buttons', () => {
    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);
    expect(screen.getByRole('button', { name: /new trade/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when trades are loading', () => {
    vi.mocked(useGetTradesQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
    } as any);

    render(<DashboardView onAddTrade={mockOnAddTrade} onImportTrades={mockOnImportTrades} />);

    // When loading, stat cards should not render (skeletons shown instead)
    expect(screen.queryAllByTestId('stat-card')).toHaveLength(0);
    // Heading should still appear
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
  });
});
