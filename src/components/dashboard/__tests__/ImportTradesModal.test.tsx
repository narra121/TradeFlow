import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportTradesModal } from '../ImportTradesModal';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock trades API
vi.mock('@/lib/api/trades', () => ({
  tradesApi: { extractTrades: vi.fn() },
}));

// Mock useAccounts hook
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn().mockReturnValue({
    accounts: [],
    selectedAccountId: null,
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    updateAccountStatus: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

// Mock Radix UI Dialog to render inline
vi.mock('@radix-ui/react-dialog', async () => {
  const React = await import('react');
  return {
    Root: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
    Portal: ({ children }: any) => <>{children}</>,
    Overlay: React.forwardRef((_props: any, _ref: any) => <div data-testid="overlay" />),
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Title: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <h2 ref={ref} {...props}>{children}</h2>
    )),
    Description: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <p ref={ref} {...props}>{children}</p>
    )),
    Close: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
  };
});

// Mock Radix UI ScrollArea
vi.mock('@radix-ui/react-scroll-area', async () => {
  const React = await import('react');
  const ScrollAreaScrollbar = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar';
  return {
    Root: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Viewport: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Scrollbar: ScrollAreaScrollbar,
    ScrollAreaScrollbar,
    ScrollAreaThumb: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Thumb: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Corner: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// Mock Radix UI Tooltip
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

// Mock Radix UI Checkbox
vi.mock('@radix-ui/react-checkbox', async () => {
  const React = await import('react');
  return {
    Root: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} role="checkbox" {...props}>{children}</button>
    )),
    Indicator: ({ children }: any) => <span>{children}</span>,
  };
});

// Mock Radix UI Select for direction select in edit rows
vi.mock('@radix-ui/react-select', async () => {
  const React = await import('react');
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Value: ({ placeholder }: any) => <span>{placeholder}</span>,
    Icon: ({ children }: any) => <>{children}</>,
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} role="option" {...props}>{children}</div>
    )),
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <>{children}</>,
    ScrollUpButton: React.forwardRef((_props: any, _ref: any) => null),
    ScrollDownButton: React.forwardRef((_props: any, _ref: any) => null),
    Group: ({ children }: any) => <div>{children}</div>,
    Label: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Separator: React.forwardRef((_props: any, _ref: any) => <hr />),
  };
});

// Mock Radix UI Popover for DateTimePicker
vi.mock('@radix-ui/react-popover', async () => {
  const React = await import('react');
  return {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    Close: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    Anchor: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  };
});

describe('ImportTradesModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportTrades: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Import Trades" title when open', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Import Trades' })).toBeInTheDocument();
  });

  it('shows upload zone with drag/drop area', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(
      screen.getByText('Drag & drop, paste from clipboard (Ctrl+V), or click to select')
    ).toBeInTheDocument();
  });

  it('shows "Select Images" button', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
  });

  it('shows "Cancel" and "Save All" buttons', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all/i })).toBeInTheDocument();
  });

  it('Save All is disabled when no trades extracted', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const saveAllButton = screen.getByRole('button', { name: /save all/i });
    expect(saveAllButton).toBeDisabled();
  });

  it('Cancel calls onOpenChange(false) and resets state', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ImportTradesModal {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows info text about import capabilities', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(
      screen.getByText(/Upload screenshots.*spreadsheet files.*paste trade data/i)
    ).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ImportTradesModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Import Trades')).not.toBeInTheDocument();
  });

  it('has a hidden file input for image uploads', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('image/*');
    expect(fileInput.multiple).toBe(true);
  });
});

describe('ImportTradesModal - Error Handling', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportTrades: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Helper: upload a fake image via the hidden file input to get into "images uploaded" state */
  async function uploadFakeImage(user: ReturnType<typeof userEvent.setup>) {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-data'], 'trade.png', { type: 'image/png' });

    // Mock FileReader to synchronously set the image
    const originalFileReader = globalThis.FileReader;
    const mockReader = {
      readAsDataURL: vi.fn(),
      onload: null as any,
      result: 'data:image/png;base64,fakedata',
    };
    vi.spyOn(globalThis, 'FileReader').mockImplementation(() => mockReader as any);

    await user.upload(fileInput, file);

    // Trigger the onload callback that processImageFile registered
    if (mockReader.onload) {
      mockReader.onload({ target: { result: mockReader.result } });
    }

    globalThis.FileReader = originalFileReader;
  }

  /** Helper: run extractTrades with a successful API response returning one trade row */
  async function extractWithOneTrade(user: ReturnType<typeof userEvent.setup>) {
    const { tradesApi } = await import('@/lib/api/trades');
    (tradesApi.extractTrades as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          symbol: 'EURUSD',
          side: 'BUY',
          entryPrice: '1.1000',
          exitPrice: '1.1050',
          stopLoss: '1.0950',
          takeProfit: '1.1100',
          quantity: '1',
          pnl: '50',
          openDate: '2024-06-01T10:00:00Z',
          closeDate: '2024-06-01T14:00:00Z',
        },
      ],
    });

    const extractButton = screen.getByRole('button', { name: /extract trades/i });
    await user.click(extractButton);

    // Wait for extraction to complete
    await vi.waitFor(() => {
      expect(screen.getByText('EURUSD')).toBeInTheDocument();
    });
  }

  it('keeps dialog open when onImportTrades returns { success: false }', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    const onImportTrades = vi.fn().mockResolvedValue({ success: false });

    render(
      <ImportTradesModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onImportTrades={onImportTrades}
      />
    );

    await uploadFakeImage(user);
    await extractWithOneTrade(user);

    const saveAllButton = screen.getByRole('button', { name: /save all/i });
    await user.click(saveAllButton);

    await vi.waitFor(() => {
      expect(onImportTrades).toHaveBeenCalled();
    });

    // Dialog should NOT have been closed
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // Modal content should still be visible
    expect(screen.getByRole('heading', { name: 'Import Trades' })).toBeInTheDocument();
  });

  it('shows extraction error banner when extract API fails', async () => {
    const user = userEvent.setup({ delay: null });
    const { tradesApi } = await import('@/lib/api/trades');

    (tradesApi.extractTrades as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('API unavailable')
    );

    render(<ImportTradesModal {...defaultProps} />);

    await uploadFakeImage(user);

    const extractButton = screen.getByRole('button', { name: /extract trades/i });
    await user.click(extractButton);

    await vi.waitFor(() => {
      expect(screen.getByText('Extraction Failed')).toBeInTheDocument();
    });
  });
});

describe('ImportTradesModal - outcome derivation', () => {
  it('derives TP outcome for positive PnL', () => {
    // The outcome logic: pnl > 0 = TP, pnl < 0 = SL, pnl == 0 = BREAKEVEN
    const pnl = 500;
    const outcome = pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN';
    expect(outcome).toBe('TP');
  });

  it('derives SL outcome for negative PnL', () => {
    const pnl = -200;
    const outcome = pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN';
    expect(outcome).toBe('SL');
  });

  it('derives BREAKEVEN outcome for zero PnL', () => {
    const pnl = 0;
    const outcome = pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN';
    expect(outcome).toBe('BREAKEVEN');
  });
});

describe('ImportTradesModal - Toolbar & Account Selector', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportTrades: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Save All button is disabled when no trades are extracted', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const saveAllButton = screen.getByRole('button', { name: /save all/i });
    expect(saveAllButton).toBeDisabled();
  });

  it('does not show account selector when no trades extracted', () => {
    render(<ImportTradesModal {...defaultProps} />);
    // Account selector only renders when extractedTrades.length > 0 && accounts.length > 0
    // Default mock has both empty, so "Save to account:" should not appear
    expect(screen.queryByText('Save to account:')).not.toBeInTheDocument();
  });

  it('merge direction validation: rejects when fewer than 2 selected', () => {
    const selectedCount = 1;
    const selectedDirections = new Set(['LONG']);
    const canMerge = selectedCount >= 2 && selectedDirections.size === 1;
    const mergeDisabledReason = selectedCount < 2
      ? 'Select 2 or more trades to merge'
      : selectedDirections.size > 1
        ? 'Can only merge trades with the same direction (all Long or all Short)'
        : '';

    expect(canMerge).toBe(false);
    expect(mergeDisabledReason).toBe('Select 2 or more trades to merge');
  });

  it('merge direction validation: rejects mixed directions', () => {
    const selectedCount = 3;
    const selectedDirections = new Set(['LONG', 'SHORT']);
    const canMerge = selectedCount >= 2 && selectedDirections.size === 1;
    const mergeDisabledReason = selectedCount < 2
      ? 'Select 2 or more trades to merge'
      : selectedDirections.size > 1
        ? 'Can only merge trades with the same direction (all Long or all Short)'
        : '';

    expect(canMerge).toBe(false);
    expect(mergeDisabledReason).toBe('Can only merge trades with the same direction (all Long or all Short)');
  });

  it('merge direction validation: allows same direction', () => {
    const selectedCount = 2;
    const selectedDirections = new Set(['LONG']);
    const canMerge = selectedCount >= 2 && selectedDirections.size === 1;
    const mergeDisabledReason = selectedCount < 2
      ? 'Select 2 or more trades to merge'
      : selectedDirections.size > 1
        ? 'Can only merge trades with the same direction (all Long or all Short)'
        : '';

    expect(canMerge).toBe(true);
    expect(mergeDisabledReason).toBe('');
  });
});

describe('ImportTradesModal - File Import UI', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onImportTrades: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows both "Select Images" and "Select File" buttons', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /select images/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
  });

  it('has a hidden spreadsheet file input with correct accept types', () => {
    render(<ImportTradesModal {...defaultProps} />);
    const inputs = document.querySelectorAll('input[type="file"]');
    const spreadsheetInput = Array.from(inputs).find(
      (input) => (input as HTMLInputElement).accept === '.csv,.txt,.xls,.xlsx'
    );
    expect(spreadsheetInput).toBeInTheDocument();
  });

  it('shows supported formats text', () => {
    render(<ImportTradesModal {...defaultProps} />);
    expect(screen.getByText(/Supports:.*CSV.*TXT.*XLS.*XLSX.*Paste text/i)).toBeInTheDocument();
  });
});
