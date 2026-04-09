import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSelect } from '../AccountSelect';
import type { TradingAccount } from '@/types/trade';

// Mock the useAccounts exports (only the non-hook exports are needed)
vi.mock('@/hooks/useAccounts', () => ({
  accountStatusLabels: {
    active: 'Active',
    breached: 'Breached',
    passed: 'Passed',
    withdrawn: 'Withdrawn',
    inactive: 'Inactive',
  },
  accountStatusColors: {
    active: 'bg-success/10 text-success border-success/20',
    breached: 'bg-destructive/10 text-destructive border-destructive/20',
    passed: 'bg-primary/10 text-primary border-primary/20',
    withdrawn: 'bg-warning/10 text-warning border-warning/20',
    inactive: 'bg-muted text-muted-foreground border-border',
  },
  accountTypeLabels: {
    prop_challenge: 'Prop Challenge',
    prop_funded: 'Funded Account',
    personal: 'Personal',
    demo: 'Demo',
  },
}));

const mockAccounts: TradingAccount[] = [
  {
    id: 'acc-1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge',
    status: 'active',
    balance: 100000,
    initialBalance: 100000,
    currency: 'USD',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'acc-2',
    name: 'Personal Account',
    broker: 'Interactive Brokers',
    type: 'personal',
    status: 'active',
    balance: 50000,
    initialBalance: 50000,
    currency: 'USD',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'acc-3',
    name: 'Demo Account',
    broker: 'MetaTrader',
    type: 'demo',
    status: 'inactive',
    balance: 10000,
    initialBalance: 10000,
    currency: 'USD',
    createdAt: '2024-03-01T00:00:00Z',
  },
];

describe('AccountSelect', () => {
  const defaultProps = {
    accounts: mockAccounts,
    selectedAccountIds: [] as string[],
    onChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder text when nothing is selected', () => {
    render(<AccountSelect {...defaultProps} />);
    expect(screen.getByText('Select accounts...')).toBeInTheDocument();
  });

  it('displays selected account names', () => {
    render(
      <AccountSelect
        {...defaultProps}
        selectedAccountIds={['acc-1', 'acc-2']}
      />
    );
    expect(screen.getByText('FTMO Challenge, Personal Account')).toBeInTheDocument();
  });

  it('shows account list when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountSelect {...defaultProps} />);

    await user.click(screen.getByText('Select accounts...'));

    expect(screen.getByText('FTMO Challenge')).toBeInTheDocument();
    expect(screen.getByText('Personal Account')).toBeInTheDocument();
    expect(screen.getByText('Demo Account')).toBeInTheDocument();
  });

  it('shows Select All and Clear buttons in the popover', async () => {
    const user = userEvent.setup();
    render(<AccountSelect {...defaultProps} />);

    await user.click(screen.getByText('Select accounts...'));

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('toggles an account selection when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AccountSelect {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText('Select accounts...'));
    await user.click(screen.getByText('FTMO Challenge'));

    expect(onChange).toHaveBeenCalledWith(['acc-1']);
  });

  it('removes an account when clicking an already selected account', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AccountSelect
        {...defaultProps}
        selectedAccountIds={['acc-1', 'acc-2']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('FTMO Challenge, Personal Account'));
    await user.click(screen.getByText('FTMO Challenge'));

    expect(onChange).toHaveBeenCalledWith(['acc-2']);
  });

  it('selects all accounts when "Select All" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AccountSelect {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText('Select accounts...'));
    await user.click(screen.getByText('Select All'));

    expect(onChange).toHaveBeenCalledWith(['acc-1', 'acc-2', 'acc-3']);
  });

  it('clears all selections when "Clear" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AccountSelect
        {...defaultProps}
        selectedAccountIds={['acc-1', 'acc-2']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('FTMO Challenge, Personal Account'));
    await user.click(screen.getByText('Clear'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows empty state when no accounts exist', async () => {
    const user = userEvent.setup();
    render(<AccountSelect {...defaultProps} accounts={[]} />);

    await user.click(screen.getByText('Select accounts...'));

    expect(
      screen.getByText('No accounts available. Add an account first.')
    ).toBeInTheDocument();
  });

  it('displays broker and account type info for each account', async () => {
    const user = userEvent.setup();
    render(<AccountSelect {...defaultProps} />);

    await user.click(screen.getByText('Select accounts...'));

    // Broker names appear in the detail text "Broker • Type"
    expect(screen.getByText(/FTMO \u2022 Prop Challenge/)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Brokers \u2022 Personal/)).toBeInTheDocument();
    expect(screen.getByText(/MetaTrader \u2022 Demo/)).toBeInTheDocument();
  });
});
