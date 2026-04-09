import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { TradeLogView } from '../TradeLogView';

// Mock RTK Query hooks from store/api
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
      },
      {
        id: '2',
        symbol: 'GBPUSD',
        direction: 'SHORT',
        entryPrice: 1.3,
        exitPrice: 1.28,
        stopLoss: 1.31,
        takeProfit: 1.27,
        size: 0.5,
        entryDate: '2025-01-16T09:00:00Z',
        exitDate: '2025-01-16T12:00:00Z',
        outcome: 'SL',
        pnl: -100,
        pnlPercent: -1.0,
        riskRewardRatio: 1.5,
        accountId: 'acc1',
      },
    ],
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
  useUpdateTradeMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useDeleteTradeMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
}));

// Mock child components that have their own complex dependencies
vi.mock('@/components/trade/TradeDetailModal', () => ({
  TradeDetailModal: () => <div data-testid="trade-detail-modal" />,
}));
vi.mock('@/components/trade/CalendarTradeModal', () => ({
  CalendarTradeModal: () => <div data-testid="calendar-trade-modal" />,
}));
vi.mock('@/components/dashboard/AddTradeModal', () => ({
  AddTradeModal: () => <div data-testid="add-trade-modal" />,
}));
vi.mock('@/components/account/AccountFilter', () => ({
  AccountFilter: () => <div data-testid="account-filter">Account Filter</div>,
}));
vi.mock('@/components/filters/DateRangeFilter', () => ({
  DateRangeFilter: () => <div data-testid="date-range-filter">Date Range Filter</div>,
  getDateRangeFromPreset: vi.fn().mockReturnValue({ from: new Date('2025-01-01'), to: new Date('2025-01-31') }),
}));
vi.mock('@/components/ui/loading-skeleton', () => ({
  TradeTableSkeleton: () => <div data-testid="trade-table-skeleton" />,
  CalendarSkeleton: () => <div data-testid="calendar-skeleton" />,
}));

describe('TradeLogView', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Trade Log')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Track and analyze your trading history')).toBeInTheDocument();
  });

  it('renders the New Trade button', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('New Trade')).toBeInTheDocument();
  });

  it('renders the Import button', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('renders the trades table with trade data', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
  });

  it('shows Symbol column header in the table', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Symbol')).toBeInTheDocument();
  });

  it('shows Direction column header in the table', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Direction')).toBeInTheDocument();
  });

  it('shows filter controls', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Filters:')).toBeInTheDocument();
  });

  it('shows Trades and Calendar tab buttons', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Trades')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('renders the account filter', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByTestId('account-filter')).toBeInTheDocument();
  });

  it('renders the date range filter', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
    });

    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByTestId('trade-table-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no trades match filters', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('No trades found')).toBeInTheDocument();
  });
});
