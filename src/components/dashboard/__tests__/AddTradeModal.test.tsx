import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTradeModal } from '../AddTradeModal';
import { Trade } from '@/types/trade';

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

// Mock Radix UI Popover for DynamicSelect / DateTimePicker
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

// Mock Radix UI Tooltip
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <>{children}</>,
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

// Mock Radix UI Separator
vi.mock('@radix-ui/react-separator', async () => {
  const React = await import('react');
  return {
    Root: React.forwardRef((props: any, ref: any) => <hr ref={ref} {...props} />),
  };
});

// Mock hooks
vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: () => ({
    options: {
      symbols: [],
      strategies: [],
      sessions: [],
      marketConditions: [],
      newsEvents: [],
      mistakes: [],
      lessons: [],
      timeframes: [],
    },
    addSymbol: vi.fn(),
    removeSymbol: vi.fn(),
    addStrategy: vi.fn(),
    removeStrategy: vi.fn(),
    addSession: vi.fn(),
    removeSession: vi.fn(),
    addMarketCondition: vi.fn(),
    removeMarketCondition: vi.fn(),
    addNewsEvent: vi.fn(),
    addMistake: vi.fn(),
    addLesson: vi.fn(),
    addTimeframe: vi.fn(),
    removeTimeframe: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTradingRules', () => ({
  useTradingRules: () => ({ rules: [] }),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [] }),
}));

// Mock the TextEnhancerButton since it relies on RTK Query
vi.mock('@/components/ui/text-enhancer-button', () => ({
  TextEnhancerButton: () => null,
}));

// Mock CachedImage used by ImageUploader
vi.mock('@/components/trade/CachedImage', () => ({
  CachedImage: (props: any) => <img {...props} />,
}));

// Mock the store API used by TextEnhancerButton
vi.mock('@/store/api/textApi', () => ({
  useEnhanceTextMutation: () => [vi.fn(), { isLoading: false }],
}));

describe('AddTradeModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddTrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add New Trade" title when open', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Add New Trade')).toBeInTheDocument();
  });

  it('renders "Edit Trade" title when editMode=true', () => {
    const editTrade: Trade = {
      id: 't-1',
      symbol: 'EURUSD',
      direction: 'LONG',
      entryPrice: 1.1,
      exitPrice: 1.12,
      stopLoss: 1.08,
      takeProfit: 1.14,
      size: 1,
      entryDate: '2024-03-01T10:00:00.000Z',
      exitDate: '2024-03-01T14:00:00.000Z',
      outcome: 'TP',
      pnl: 200,
      riskRewardRatio: 1.5,
    };

    render(<AddTradeModal {...defaultProps} editMode={true} initialTrade={editTrade} />);
    expect(screen.getByText('Edit Trade')).toBeInTheDocument();
  });

  it('shows direction toggle with Long and Short buttons', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Long')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
  });

  it('shows core trade fields (Symbol, Entry Price, Exit Price, Size)', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Entry Price')).toBeInTheDocument();
    expect(screen.getByText('Exit Price')).toBeInTheDocument();
    expect(screen.getByText('Size (lots)')).toBeInTheDocument();
  });

  it('shows date pickers (Entry Date, Exit Date)', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Entry Date & Time')).toBeInTheDocument();
    expect(screen.getByText('Exit Date & Time')).toBeInTheDocument();
  });

  it('shows outcome selector', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Outcome')).toBeInTheDocument();
  });

  it('shows trade context section (Strategy, Session, Market Condition)', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText('Trade Context')).toBeInTheDocument();
    expect(screen.getByText('Strategy / Setup')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('Market Condition')).toBeInTheDocument();
  });

  it('shows analysis section (News/Events, Key Lesson, Mistakes)', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('News / Events')).toBeInTheDocument();
    expect(screen.getByText('Key Lesson')).toBeInTheDocument();
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
  });

  it('shows trade notes section with textarea', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText('Trade Notes')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Add any additional notes about this trade...')
    ).toBeInTheDocument();
  });

  it('shows visual evidence section', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Visual Evidence')).toBeInTheDocument();
  });

  it('cancel button calls onOpenChange(false)', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();

    render(<AddTradeModal {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading spinner when submitting', async () => {
    const user = userEvent.setup({ delay: null });
    const onAddTrade = vi.fn(() => new Promise(() => {})); // never resolves

    render(<AddTradeModal {...defaultProps} onAddTrade={onAddTrade} />);

    // Click submit button (the "Add Trade" button)
    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    // Should show loading text
    expect(screen.getByText('Adding...')).toBeInTheDocument();

    // Submit button should be disabled during submission
    const savingButton = screen.getByRole('button', { name: /adding/i });
    expect(savingButton).toBeDisabled();
  });

  it('keeps dialog open when onAddTrade rejects (API error)', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    const onAddTrade = vi.fn().mockRejectedValue(new Error('Validation failed'));

    render(<AddTradeModal {...defaultProps} onOpenChange={onOpenChange} onAddTrade={onAddTrade} />);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    // Wait for async rejection to settle
    await vi.waitFor(() => {
      expect(onAddTrade).toHaveBeenCalled();
    });

    // Dialog should NOT have been closed
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // Modal content should still be visible
    expect(screen.getByText('Add New Trade')).toBeInTheDocument();
  });

  it('closes dialog when onAddTrade resolves (success)', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    const onAddTrade = vi.fn().mockResolvedValue(undefined);

    render(<AddTradeModal {...defaultProps} onOpenChange={onOpenChange} onAddTrade={onAddTrade} />);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not render when open is false', () => {
    render(<AddTradeModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Add New Trade')).not.toBeInTheDocument();
  });

  it('shows "Add Trade" button text when not in edit mode', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add trade/i })).toBeInTheDocument();
  });

  it('shows "Save" button text in edit mode', () => {
    const editTrade: Trade = {
      id: 't-2',
      symbol: 'GBPUSD',
      direction: 'SHORT',
      entryPrice: 1.25,
      stopLoss: 1.27,
      takeProfit: 1.22,
      size: 0.5,
      entryDate: '2024-03-01T10:00:00.000Z',
      outcome: 'SL',
      riskRewardRatio: 1.5,
    };

    render(<AddTradeModal {...defaultProps} editMode={true} initialTrade={editTrade} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows Net PnL field', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Net PnL ($)')).toBeInTheDocument();
  });

  it('shows Stop Loss and Take Profit fields', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Stop Loss')).toBeInTheDocument();
    expect(screen.getByText('Take Profit')).toBeInTheDocument();
  });

  it('shows Core Details section header', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Core Details')).toBeInTheDocument();
  });
});
