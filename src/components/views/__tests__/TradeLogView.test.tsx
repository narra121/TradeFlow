import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, screen, waitFor } from '@/test/test-utils';
import { TradeLogView } from '../TradeLogView';

// Use vi.hoisted so the mock fn is available inside the hoisted vi.mock factory
const { mockBulkDeleteTrades } = vi.hoisted(() => ({
  mockBulkDeleteTrades: vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
}));

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
    refetch: vi.fn(),
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
  useBulkDeleteTradesMutation: vi.fn().mockReturnValue([
    mockBulkDeleteTrades,
  ]),
}));

// Mock Radix UI components used by TradeLogView
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

vi.mock('@radix-ui/react-popover', async () => {
  const React = await import('react');
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Close: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    Anchor: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  };
});

vi.mock('@radix-ui/react-alert-dialog', async () => {
  const React = await import('react');
  const AlertDialogContext = React.createContext<{ onOpenChange?: (open: boolean) => void }>({});
  return {
    Root: ({ children, open, onOpenChange }: any) =>
      open ? (
        <AlertDialogContext.Provider value={{ onOpenChange }}>
          <div role="alertdialog" data-state="open">{children}</div>
        </AlertDialogContext.Provider>
      ) : null,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    Portal: ({ children }: any) => <>{children}</>,
    Overlay: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    Title: React.forwardRef(({ children, ...props }: any, ref: any) => <h2 ref={ref} {...props}>{children}</h2>),
    Description: React.forwardRef(({ children, ...props }: any, ref: any) => <p ref={ref} {...props}>{children}</p>),
    Action: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    Cancel: React.forwardRef(({ children, onClick, ...props }: any, ref: any) => {
      const { onOpenChange } = React.useContext(AlertDialogContext);
      return (
        <button
          ref={ref}
          {...props}
          onClick={(e: any) => {
            onClick?.(e);
            onOpenChange?.(false);
          }}
        >
          {children}
        </button>
      );
    }),
  };
});

vi.mock('@radix-ui/react-checkbox', async () => {
  const React = await import('react');
  return {
    Root: React.forwardRef(({ children, onCheckedChange, checked, ...props }: any, ref: any) => (
      <button
        ref={ref}
        role="checkbox"
        aria-checked={!!checked}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {children}
      </button>
    )),
    Indicator: ({ children }: any) => <span>{children}</span>,
  };
});

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
    expect(screen.getByText('View, filter, and manage all your trades')).toBeInTheDocument();
  });

  it('renders the Add Trade button', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('Add Trade')).toBeInTheDocument();
  });

  it('renders the Import button', () => {
    render(<TradeLogView {...defaultProps} />);
    // "Import" text appears in both a hidden sm:inline and sm:hidden span
    expect(screen.getAllByText('Import').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the trades table with trade data', () => {
    render(<TradeLogView {...defaultProps} />);
    // Symbols appear in both table rows and filter dropdown — use getAllByText
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('GBPUSD').length).toBeGreaterThanOrEqual(1);
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
      refetch: vi.fn(),
    });

    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('No trades found')).toBeInTheDocument();
  });

  // ── Sorting ─────────────────────────────────────────────────

  it('renders sortable column headers with sort icons', () => {
    render(<TradeLogView {...defaultProps} />);
    const sortIcons = document.querySelectorAll('th svg');
    expect(sortIcons.length).toBeGreaterThanOrEqual(9);
  });

  // ── Multi-select filters ────────────────────────────────────

  it('renders multi-select filter buttons', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.getByText('All Symbols')).toBeInTheDocument();
    expect(screen.getByText('All Outcomes')).toBeInTheDocument();
  });

  // ── Bulk select & delete ────────────────────────────────────

  it('renders checkboxes in the trade table', () => {
    render(<TradeLogView {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 select-all + 2 trade rows + 2 filter checkboxes (symbols) = 5
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });

  it('does not show bulk actions toolbar when no trades selected', () => {
    render(<TradeLogView {...defaultProps} />);
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument();
  });
});

// ── Calendar Headers ──────────────────────────────────────────

describe('TradeLogView - Calendar Headers', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calendar day headers start with Monday', async () => {
    const user = userEvent.setup();
    render(<TradeLogView {...defaultProps} />);

    // Switch to the Calendar tab
    await user.click(screen.getByText('Calendar'));

    // Verify all day headers are present
    const expectedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    expectedDays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });

    // Verify the order: Mon should come first among the day headers
    const dayHeaders = expectedDays.map(day => screen.getByText(day));
    for (let i = 0; i < dayHeaders.length - 1; i++) {
      // compareDocumentPosition bit 4 = DOCUMENT_POSITION_FOLLOWING
      const position = dayHeaders[i].compareDocumentPosition(dayHeaders[i + 1]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

// ── Bulk Delete Confirmation ──────────────────────────────────

describe('TradeLogView - Bulk Delete Confirmation', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the mock to default (with trades) before each test
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
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
      refetch: vi.fn(),
    });
  });

  async function selectTradesAndClickDelete() {
    const user = userEvent.setup();
    render(<TradeLogView {...defaultProps} />);

    // Find trade row checkboxes: they are inside <td> elements
    const tradeCheckboxes = screen.getAllByRole('checkbox').filter(
      (el) => el.closest('td') !== null
    );
    // Click the first trade row checkbox to select it
    await user.click(tradeCheckboxes[0]);

    // Wait for the bulk actions toolbar to appear
    const deleteButton = await screen.findByText('Delete Selected');
    await user.click(deleteButton);

    return user;
  }

  it('shows confirmation dialog when Delete Selected is clicked', async () => {
    await selectTradesAndClickDelete();

    // Verify the confirmation dialog appears with expected text
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
    // Title and action button both mention "Delete N trade(s)"
    expect(screen.getAllByText(/Delete \d+ trade/).length).toBeGreaterThanOrEqual(1);
  });

  it('does not delete trades until confirmed', async () => {
    await selectTradesAndClickDelete();

    // Dialog is open but bulkDeleteTrades should NOT have been called yet
    expect(mockBulkDeleteTrades).not.toHaveBeenCalled();
  });

  it('deletes trades after confirmation', async () => {
    const user = await selectTradesAndClickDelete();

    // Find and click the confirmation action button in the dialog
    // The action button text matches "Delete N trade(s)"
    const confirmButton = screen.getByRole('button', { name: /Delete \d+ trade/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockBulkDeleteTrades).toHaveBeenCalledTimes(1);
    });
    expect(mockBulkDeleteTrades).toHaveBeenCalledWith(
      expect.objectContaining({ tradeIds: expect.any(Array) })
    );
  });

  it('closes dialog on cancel', async () => {
    const user = await selectTradesAndClickDelete();

    // Verify the dialog is visible
    expect(screen.getByText(/permanently delete/)).toBeInTheDocument();

    // Click the Cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    // Dialog should close - the alert dialog content should not be visible
    await waitFor(() => {
      expect(screen.queryByText(/permanently delete/)).not.toBeInTheDocument();
    });

    // bulkDeleteTrades should NOT have been called
    expect(mockBulkDeleteTrades).not.toHaveBeenCalled();
  });
});

// ── Empty State ───────────────────────────────────────────────

describe('TradeLogView - Empty State', () => {
  const defaultProps = {
    onAddTrade: vi.fn(),
    onImportTrades: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows helpful empty state when no trades match filters', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<TradeLogView {...defaultProps} />);

    // Verify "No trades found" heading appears
    expect(screen.getByText('No trades found')).toBeInTheDocument();

    // Verify "Add Trade" button appears in the empty state
    // The header also has an "Add Trade" button, so there should be at least 2
    const addTradeButtons = screen.getAllByText('Add Trade');
    expect(addTradeButtons.length).toBeGreaterThanOrEqual(2);

    // Verify the empty state message mentions adding first trade
    expect(screen.getByText(/Add your first trade/i)).toBeInTheDocument();
  });

  it('shows filter-aware message when filters are active', async () => {
    const { useGetTradesQuery } = await import('@/store/api');
    (useGetTradesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
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
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    render(<TradeLogView {...defaultProps} />);

    // Verify the trade is initially visible
    expect(screen.getAllByText('EURUSD').length).toBeGreaterThanOrEqual(1);

    // Open the outcome filter and select "SL" only — this will filter out the TP trade
    await user.click(screen.getByText('All Outcomes'));

    // Click the SL (Stop Loss) checkbox in the outcome filter popover
    const slLabel = screen.getByText('SL (Stop Loss)');
    await user.click(slLabel);

    // Now no trades should match because the only trade has outcome TP
    await waitFor(() => {
      expect(screen.getByText('No trades found')).toBeInTheDocument();
    });

    // Verify the filter-aware message
    expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();

    // The "Add Trade" CTA should NOT appear when filters are active
    // (only the header one should remain)
    const addTradeInEmptyState = screen.queryByRole('button', { name: /Add Trade/ });
    // The header has the Add Trade button, but the empty state should not
    // We check that the filter-specific message is shown instead of the default
    expect(screen.queryByText(/Add your first trade/i)).not.toBeInTheDocument();
  });
});
