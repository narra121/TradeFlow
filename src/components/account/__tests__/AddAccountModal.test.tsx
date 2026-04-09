import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddAccountModal } from '../AddAccountModal';
import { TradingAccount } from '@/types/trade';

// Mock Radix UI Dialog to render inline instead of via portal
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

// Mock Radix UI Select to render a simple native select-like structure
vi.mock('@radix-ui/react-select', async () => {
  const React = await import('react');
  return {
    Root: ({ children, value, onValueChange, ...props }: any) => (
      <div data-testid="select-root" data-value={value}>
        {React.Children.map(children, (child: any) =>
          child ? React.cloneElement(child, { value, onValueChange }) : null
        )}
      </div>
    ),
    Trigger: React.forwardRef(({ children, value, ...props }: any, ref: any) => (
      <button ref={ref} role="combobox" {...props}>{children}</button>
    )),
    Value: ({ placeholder }: any) => <span>{placeholder}</span>,
    Icon: ({ children }: any) => <>{children}</>,
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: React.forwardRef(({ children, value, ...props }: any, ref: any) => (
      <div ref={ref} role="option" data-value={value} {...props}>{children}</div>
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

// Mock the TextEnhancerButton since it relies on RTK Query
vi.mock('@/components/ui/text-enhancer-button', () => ({
  TextEnhancerButton: () => null,
}));

const mockEditAccount: TradingAccount = {
  id: 'acc-1',
  name: 'FTMO 100k',
  broker: 'FTMO',
  type: 'prop_funded',
  status: 'active',
  initialBalance: 100000,
  balance: 105000,
  currency: 'EUR',
  createdAt: '2024-01-01T00:00:00.000Z',
  notes: 'My funded account',
};

describe('AddAccountModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAddAccount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add New Account" title when open and no editAccount', () => {
    render(<AddAccountModal {...defaultProps} />);
    expect(screen.getByText('Add New Account')).toBeInTheDocument();
  });

  it('renders "Edit Account" title when editAccount is provided', () => {
    render(<AddAccountModal {...defaultProps} editAccount={mockEditAccount} />);
    expect(screen.getByText('Edit Account')).toBeInTheDocument();
  });

  it('shows all form fields', () => {
    render(<AddAccountModal {...defaultProps} />);

    expect(screen.getByText('Account Name')).toBeInTheDocument();
    expect(screen.getByText('Broker / Firm')).toBeInTheDocument();
    expect(screen.getByText('Account Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Initial Balance')).toBeInTheDocument();
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
  });

  it('calls onAddAccount with correct data on submit', async () => {
    const user = userEvent.setup();
    const onAddAccount = vi.fn();

    render(<AddAccountModal {...defaultProps} onAddAccount={onAddAccount} />);

    // Fill in the form
    const nameInput = screen.getByPlaceholderText('e.g., FTMO $100k Challenge');
    const brokerInput = screen.getByPlaceholderText('e.g., FTMO, MyForexFunds');
    const initialBalanceInput = screen.getByPlaceholderText('100000');

    await user.type(nameInput, 'My Test Account');
    await user.type(brokerInput, 'TestBroker');
    await user.type(initialBalanceInput, '50000');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add account/i });
    await user.click(submitButton);

    expect(onAddAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Test Account',
        broker: 'TestBroker',
        initialBalance: 50000,
        type: 'prop_challenge', // default
        status: 'active', // default
        currency: 'USD', // default
      })
    );
  });

  it('calls onOpenChange when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<AddAccountModal {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state when isLoading=true', () => {
    render(<AddAccountModal {...defaultProps} isLoading={true} />);

    // Buttons should be disabled
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const submitButton = screen.getByRole('button', { name: /adding/i });

    expect(cancelButton).toBeDisabled();
    expect(submitButton).toBeDisabled();

    // Should show "Adding..." text
    expect(screen.getByText('Adding...')).toBeInTheDocument();
  });

  it('shows "Saving..." in loading state when editing', () => {
    render(
      <AddAccountModal {...defaultProps} isLoading={true} editAccount={mockEditAccount} />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('populates form with editAccount data when editing', () => {
    render(<AddAccountModal {...defaultProps} editAccount={mockEditAccount} />);

    const nameInput = screen.getByPlaceholderText('e.g., FTMO $100k Challenge');
    const brokerInput = screen.getByPlaceholderText('e.g., FTMO, MyForexFunds');
    const initialBalanceInput = screen.getByPlaceholderText('100000');
    const balanceInput = screen.getByPlaceholderText('Optional');

    expect(nameInput).toHaveValue('FTMO 100k');
    expect(brokerInput).toHaveValue('FTMO');
    expect(initialBalanceInput).toHaveValue(100000);
    expect(balanceInput).toHaveValue(105000);
  });

  it('shows "Save Changes" button when editing', () => {
    render(<AddAccountModal {...defaultProps} editAccount={mockEditAccount} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('required fields (name, broker, initialBalance) are present with required attribute', () => {
    render(<AddAccountModal {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('e.g., FTMO $100k Challenge');
    const brokerInput = screen.getByPlaceholderText('e.g., FTMO, MyForexFunds');
    const initialBalanceInput = screen.getByPlaceholderText('100000');

    expect(nameInput).toBeRequired();
    expect(brokerInput).toBeRequired();
    expect(initialBalanceInput).toBeRequired();
  });

  it('does not render when open is false', () => {
    render(<AddAccountModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Add New Account')).not.toBeInTheDocument();
  });

  it('shows notes textarea populated when editing account with notes', () => {
    render(<AddAccountModal {...defaultProps} editAccount={mockEditAccount} />);

    const notesArea = screen.getByPlaceholderText('Any additional notes about this account...');
    expect(notesArea).toHaveValue('My funded account');
  });
});
