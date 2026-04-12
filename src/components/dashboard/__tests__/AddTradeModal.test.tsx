import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTradeModal } from '../AddTradeModal';
import { Trade } from '@/types/trade';

// Mock react-router-dom Link for BrokenRulesSelect's "Go to Goals & Rules" link
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  const React = await import('react');
  return {
    ...actual,
    Link: React.forwardRef(({ children, to, ...props }: any, ref: any) => (
      <a ref={ref} href={to} {...props}>{children}</a>
    )),
  };
});

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

// Mock DateTimePicker to render a simple input for testability
vi.mock('@/components/ui/datetime-picker', () => ({
  DateTimePicker: ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  ),
}));

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
  useTradingRules: vi.fn().mockReturnValue({ rules: [], loading: false }),
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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from 'sonner';

// Helper to fill required form fields before submission
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  // Fill symbol via DynamicSelect — click "Add New" to show input, type, click "Add"
  const addNewButtons = screen.getAllByText('Add New');
  await user.click(addNewButtons[0]); // First "Add New" is for Symbol
  const newValueInputs = screen.getAllByPlaceholderText('Enter new value...');
  await user.type(newValueInputs[0], 'EURUSD');
  const addButtons = screen.getAllByRole('button', { name: 'Add' });
  await user.click(addButtons[0]);

  // Fill entry price (1st "0.00" placeholder input)
  const numberInputs = screen.getAllByPlaceholderText('0.00');
  await user.clear(numberInputs[0]);
  await user.type(numberInputs[0], '1.10');
  // Fill exit price (2nd "0.00" placeholder input)
  await user.clear(numberInputs[1]);
  await user.type(numberInputs[1], '1.12');
  // Fill entry date via mocked DateTimePicker input
  const entryDateInput = screen.getByPlaceholderText('Select entry time');
  await user.clear(entryDateInput);
  await user.type(entryDateInput, '2025-01-15T10:00');
  // Fill exit date via mocked DateTimePicker input
  const exitDateInput = screen.getByPlaceholderText('Select exit time');
  await user.clear(exitDateInput);
  await user.type(exitDateInput, '2025-01-15T14:00');
}

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

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

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

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

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

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

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
      exitPrice: 1.28,
      stopLoss: 1.27,
      takeProfit: 1.22,
      size: 0.5,
      entryDate: '2024-03-01T10:00:00.000Z',
      exitDate: '2024-03-01T14:00:00.000Z',
      outcome: 'SL',
      pnl: -150,
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

describe('AddTradeModal - Error Handling', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddTrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps dialog open when onAddTrade rejects with a network error', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    const onAddTrade = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<AddTradeModal {...defaultProps} onOpenChange={onOpenChange} onAddTrade={onAddTrade} />);

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(onAddTrade).toHaveBeenCalled();
    });

    // Dialog should NOT close on network error
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // Modal content should still be visible
    expect(screen.getByText('Add New Trade')).toBeInTheDocument();
  });

  it('resets isSubmitting to false after onAddTrade rejects (button re-enabled)', async () => {
    const user = userEvent.setup({ delay: null });
    const onAddTrade = vi.fn().mockRejectedValue(new Error('Server error'));

    render(<AddTradeModal {...defaultProps} onAddTrade={onAddTrade} />);

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(onAddTrade).toHaveBeenCalled();
    });

    // After rejection settles, the button should no longer be disabled
    await vi.waitFor(() => {
      const btn = screen.getByRole('button', { name: /add trade/i });
      expect(btn).not.toBeDisabled();
    });
  }, 15000);

  it('closes dialog when onAddTrade resolves successfully', async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    const onAddTrade = vi.fn().mockResolvedValue(undefined);

    render(<AddTradeModal {...defaultProps} onOpenChange={onOpenChange} onAddTrade={onAddTrade} />);

    // Fill required fields so form validation passes
    await fillRequiredFields(user);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('AddTradeModal - UX Enhancements', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddTrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays required field indicators on mandatory fields', () => {
    render(<AddTradeModal {...defaultProps} />);

    const requiredLabels = ['Symbol', 'Entry Price', 'Size (lots)', 'Entry Date & Time'];

    for (const labelText of requiredLabels) {
      const label = screen.getByText((_content, element) => {
        return (
          element?.tagName === 'LABEL' &&
          element?.textContent?.includes(labelText) === true &&
          element?.textContent?.includes('*') === true
        );
      });
      expect(label).toBeInTheDocument();
    }
  });

  it('shows section description for Core Details', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(
      screen.getByText((_content, element) =>
        element?.textContent?.includes('Required fields are marked with') === true &&
        element?.tagName === 'P'
      )
    ).toBeInTheDocument();
  });

  it('shows optional section descriptions', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText(/helps with pattern analysis/)).toBeInTheDocument();
    expect(screen.getByText(/track lessons and mistakes/)).toBeInTheDocument();
    expect(screen.getByText(/add context for future review/)).toBeInTheDocument();
    expect(screen.getByText(/attach chart screenshots/)).toBeInTheDocument();
  });

  it('shows PnL helper text for auto-calculation', async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddTradeModal {...defaultProps} />);

    // Find the entry price and exit price inputs by their placeholder and position
    const numberInputs = screen.getAllByPlaceholderText('0.00');
    // Order in DOM: Entry Price, Exit Price, Stop Loss, Take Profit, then PnL (placeholder may differ)
    const entryPriceInput = numberInputs[0];
    const exitPriceInput = numberInputs[1];

    await user.clear(entryPriceInput);
    await user.type(entryPriceInput, '1.1000');
    await user.clear(exitPriceInput);
    await user.type(exitPriceInput, '1.1050');

    expect(screen.getByText(/Auto-calculated from entry\/exit prices/)).toBeInTheDocument();
  });

  it('shows PnL helper text for manual override', async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddTradeModal {...defaultProps} />);

    // The PnL input also has placeholder '0.00' (when calculatedPnl is empty)
    // It's the 5th "0.00" placeholder input in the form
    const numberInputs = screen.getAllByPlaceholderText('0.00');
    // Entry Price(0), Exit Price(1), Stop Loss(2), Take Profit(3), PnL(4)
    const pnlInput = numberInputs[4];

    await user.clear(pnlInput);
    await user.type(pnlInput, '150');

    expect(screen.getByText(/Manual override active/)).toBeInTheDocument();
  });

  it('shows PnL helper text when no prices entered', () => {
    render(<AddTradeModal {...defaultProps} />);

    expect(screen.getByText(/Enter prices above for auto-calculation/)).toBeInTheDocument();
  });
});

describe('AddTradeModal - Broken Rules Section', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddTrade: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always shows Broken Rules label even when no rules exist', () => {
    // Default mock has rules: []
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Broken Rules')).toBeInTheDocument();
  });

  it('shows empty state guidance when no rules exist', () => {
    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('No trading rules defined yet')).toBeInTheDocument();
  });

  it('shows button to open Goals & Rules in empty state', () => {
    render(<AddTradeModal {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /Go to Goals & Rules/ });
    expect(btn).toBeInTheDocument();
  });

  it('shows "from Goals & Rules" attribution when rules exist', async () => {
    const { useTradingRules } = await import('@/hooks/useTradingRules');
    (useTradingRules as ReturnType<typeof vi.fn>).mockReturnValue({
      rules: [
        { userId: 'u1', ruleId: 'r1', rule: 'Always use stop loss', completed: false, isActive: true, createdAt: '', updatedAt: '' },
      ],
      loading: false,
    });

    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('from Goals & Rules')).toBeInTheDocument();
  });

  it('renders rule buttons when rules exist', async () => {
    const { useTradingRules } = await import('@/hooks/useTradingRules');
    (useTradingRules as ReturnType<typeof vi.fn>).mockReturnValue({
      rules: [
        { userId: 'u1', ruleId: 'r1', rule: 'Always use stop loss', completed: false, isActive: true, createdAt: '', updatedAt: '' },
        { userId: 'u1', ruleId: 'r2', rule: 'Max 2% risk per trade', completed: false, isActive: true, createdAt: '', updatedAt: '' },
      ],
      loading: false,
    });

    render(<AddTradeModal {...defaultProps} />);
    expect(screen.getByText('Always use stop loss')).toBeInTheDocument();
    expect(screen.getByText('Max 2% risk per trade')).toBeInTheDocument();
  });

  it('does not show empty state when rules exist', async () => {
    const { useTradingRules } = await import('@/hooks/useTradingRules');
    (useTradingRules as ReturnType<typeof vi.fn>).mockReturnValue({
      rules: [
        { userId: 'u1', ruleId: 'r1', rule: 'Always use stop loss', completed: false, isActive: true, createdAt: '', updatedAt: '' },
      ],
      loading: false,
    });

    render(<AddTradeModal {...defaultProps} />);
    expect(screen.queryByText('No trading rules defined yet')).not.toBeInTheDocument();
  });
});

describe('AddTradeModal - Toast Validation', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddTrade: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows toast warning when submitting with no fields filled', async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddTradeModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    expect(toast.warning).toHaveBeenCalledWith('Missing required fields', expect.objectContaining({
      description: expect.stringContaining('Symbol is required'),
    }));
    expect(defaultProps.onAddTrade).not.toHaveBeenCalled();
  });

  it('does not show toast when all required fields are filled', async () => {
    const user = userEvent.setup({ delay: null });
    const onAddTrade = vi.fn().mockResolvedValue(undefined);
    render(<AddTradeModal {...defaultProps} onAddTrade={onAddTrade} />);

    await fillRequiredFields(user);

    const submitButton = screen.getByRole('button', { name: /add trade/i });
    await user.click(submitButton);

    expect(toast.warning).not.toHaveBeenCalled();
  });
});
