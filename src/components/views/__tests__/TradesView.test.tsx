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

  it('renders the Add Trade button', () => {
    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('Add Trade')).toBeInTheDocument();
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

describe('TradesView - Trade Cards & Direction Indicators', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trade rows for each trade in the data', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, pnlPercent: 2.0, riskRewardRatio: 2.0, accountId: 'acc1',
        },
        {
          id: '2', symbol: 'GBPUSD', direction: 'SHORT', entryPrice: 1.3,
          exitPrice: 1.28, stopLoss: 1.31, takeProfit: 1.27, size: 0.5,
          entryDate: '2025-01-16T09:00:00Z', exitDate: '2025-01-16T12:00:00Z',
          outcome: 'SL', pnl: -100, pnlPercent: -1.0, riskRewardRatio: 1.5, accountId: 'acc1',
        },
        {
          id: '3', symbol: 'USDJPY', direction: 'LONG', entryPrice: 150.5,
          exitPrice: 151.0, stopLoss: 150.0, takeProfit: 151.5, size: 2,
          entryDate: '2025-01-17T08:00:00Z', exitDate: '2025-01-17T11:00:00Z',
          outcome: 'PARTIAL', pnl: 50, pnlPercent: 0.5, riskRewardRatio: 1.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.getByText('USDJPY')).toBeInTheDocument();
  });

  it('handles empty trades array gracefully', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);
    expect(screen.getByText('No trades found')).toBeInTheDocument();
    // The table header should still render
    expect(screen.getByText('Symbol')).toBeInTheDocument();
  });

  it('shows correct direction indicators for LONG and SHORT trades', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, pnlPercent: 2.0, riskRewardRatio: 2.0, accountId: 'acc1',
        },
        {
          id: '2', symbol: 'GBPUSD', direction: 'SHORT', entryPrice: 1.3,
          exitPrice: 1.28, stopLoss: 1.31, takeProfit: 1.27, size: 0.5,
          entryDate: '2025-01-16T09:00:00Z', exitDate: '2025-01-16T12:00:00Z',
          outcome: 'SL', pnl: -100, pnlPercent: -1.0, riskRewardRatio: 1.5, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);

    // Direction labels are rendered as badge-like spans
    const longBadges = screen.getAllByText('LONG');
    const shortBadges = screen.getAllByText('SHORT');
    expect(longBadges.length).toBeGreaterThanOrEqual(1);
    expect(shortBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('displays P&L values with correct sign formatting', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, pnlPercent: 2.0, riskRewardRatio: 2.0, accountId: 'acc1',
        },
        {
          id: '2', symbol: 'GBPUSD', direction: 'SHORT', entryPrice: 1.3,
          exitPrice: 1.28, stopLoss: 1.31, takeProfit: 1.27, size: 0.5,
          entryDate: '2025-01-16T09:00:00Z', exitDate: '2025-01-16T12:00:00Z',
          outcome: 'SL', pnl: -100, pnlPercent: -1.0, riskRewardRatio: 1.5, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);

    // Positive PnL shows +$200.00
    expect(screen.getByText('+$200.00')).toBeInTheDocument();
    // Negative PnL shows $-100.00 (no + prefix, the minus is part of the number)
    expect(screen.getByText('$-100.00')).toBeInTheDocument();
  });

  it('renders view and action buttons for each trade row', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, pnlPercent: 2.0, riskRewardRatio: 2.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
    });

    render(<TradesView {...defaultProps} />);

    // Each trade row has an Eye (view) button and a MoreHorizontal (dropdown) button
    const buttons = screen.getAllByRole('button');
    // At minimum: Import, Add Trade, outcome filters (5), plus row buttons (2)
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });
});

describe('TradesView - Filtering with useMemo', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1.1,
          exitPrice: 1.12, stopLoss: 1.09, takeProfit: 1.13, size: 1,
          entryDate: '2025-01-15T10:00:00Z', exitDate: '2025-01-15T14:00:00Z',
          outcome: 'TP', pnl: 200, pnlPercent: 2.0, riskRewardRatio: 2.0, accountId: 'acc1',
        },
        {
          id: '2', symbol: 'GBPUSD', direction: 'SHORT', entryPrice: 1.3,
          exitPrice: 1.28, stopLoss: 1.31, takeProfit: 1.27, size: 0.5,
          entryDate: '2025-01-16T09:00:00Z', exitDate: '2025-01-16T12:00:00Z',
          outcome: 'SL', pnl: -100, pnlPercent: -1.0, riskRewardRatio: 1.5, accountId: 'acc1',
        },
        {
          id: '3', symbol: 'EURUSD', direction: 'SHORT', entryPrice: 1.12,
          exitPrice: 1.1, stopLoss: 1.13, takeProfit: 1.09, size: 1,
          entryDate: '2025-01-17T10:00:00Z', exitDate: '2025-01-17T14:00:00Z',
          outcome: 'SL', pnl: -50, pnlPercent: -0.5, riskRewardRatio: 1.0, accountId: 'acc1',
        },
      ],
      isLoading: false,
      isFetching: false,
    });
  });

  it('filters trades by search query', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<TradesView {...defaultProps} />);

    // All trades visible initially (two EURUSD trades + one GBPUSD)
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search by symbol...');
    fireEvent.change(searchInput, { target: { value: 'GBP' } });

    // Only GBPUSD should remain
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(screen.queryAllByText('EURUSD')).toHaveLength(0);
  });

  it('filters trades by outcome when clicking outcome filter buttons', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<TradesView {...defaultProps} />);

    // All 3 trades visible initially
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();

    // Click 'TP' outcome filter (the first TP button is the filter, subsequent are in data rows)
    const tpButtons = screen.getAllByText('TP');
    // The filter button is the one in the filter bar area
    fireEvent.click(tpButtons[0]);

    // Only TP trades should remain (EURUSD with TP outcome)
    // GBPUSD (SL) should be hidden
    expect(screen.queryByText('GBPUSD')).not.toBeInTheDocument();
  });
});
