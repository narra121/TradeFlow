import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { TradesView } from '../TradesView';

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
  useUpdateTradeMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useDeleteTradeMutation: vi.fn().mockReturnValue([
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
}));

// Mock child components
vi.mock('@/components/trade/TradeDetailModal', () => ({
  TradeDetailModal: () => <div data-testid="trade-detail-modal" />,
}));
vi.mock('@/components/dashboard/AddTradeModal', () => ({
  AddTradeModal: () => <div data-testid="add-trade-modal" />,
}));

describe('TradesView', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('Trade Log')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('All your trading history')).toBeInTheDocument();
  });

  it('renders the New Trade button', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('New Trade')).toBeInTheDocument();
  });

  it('renders the Import button', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search by symbol...')).toBeInTheDocument();
  });

  it('renders outcome filter buttons', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    // TP, SL, PARTIAL, BREAKEVEN appear both as filter buttons and in the trades table
    expect(screen.getAllByText('TP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PARTIAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('BREAKEVEN')).toBeInTheDocument();
  });

  it('renders the trades table with trade data', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
  });

  it('shows table column headers', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('R:R')).toBeInTheDocument();
    expect(screen.getByText('Outcome')).toBeInTheDocument();
  });

  it('shows empty state when no trades match filters', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('No trades found')).toBeInTheDocument();
  });
});
