import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCard } from '../AccountCard';
import type { TradingAccount, AccountStatus } from '@/types/trade';

describe('AccountCard', () => {
  const mockAccount: TradingAccount = {
    id: 'acc-1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge',
    status: 'active',
    balance: 110000,
    initialBalance: 100000,
    currency: 'USD',
    createdAt: '2024-01-15T00:00:00.000Z',
    notes: 'Phase 1',
  };

  const defaultHandlers = {
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    expect(screen.getByText('FTMO Challenge')).toBeInTheDocument();
  });

  it('displays the account name and broker', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    expect(screen.getByText('FTMO Challenge')).toBeInTheDocument();
    expect(screen.getByText('FTMO')).toBeInTheDocument();
  });

  it('displays the account type label', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    expect(screen.getByText('Prop Challenge')).toBeInTheDocument();
  });

  it('displays the account balance with currency', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    // The component renders `${currency} ${balance.toLocaleString()}`
    expect(screen.getByText(`USD ${(110000).toLocaleString()}`)).toBeInTheDocument();
  });

  it('displays the account status badge', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    // Two badge elements exist (desktop + mobile), so use getAllByText
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
  });

  it('displays positive P&L correctly', () => {
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    // P&L = 110000 - 100000 = 10000, pnlPercent = 10.00
    // The component renders: `{isProfitable ? '+' : ''}{account.currency} {pnl.toLocaleString()} ({pnlPercent}%)`
    const pnlText = `+USD ${(10000).toLocaleString()} (10.00%)`;
    expect(screen.getByText(pnlText)).toBeInTheDocument();
  });

  it('displays negative P&L correctly', () => {
    const losingAccount: TradingAccount = {
      ...mockAccount,
      balance: 95000,
    };
    render(
      <AccountCard
        account={losingAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    // P&L = 95000 - 100000 = -5000, pnlPercent = -5.00
    const pnlText = `USD ${(-5000).toLocaleString()} (-5.00%)`;
    expect(screen.getByText(pnlText)).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );

    // Click on the account name area (the outer div)
    await user.click(screen.getByText('FTMO Challenge'));
    expect(defaultHandlers.onSelect).toHaveBeenCalled();
  });

  it('renders different status badges', () => {
    const statuses: AccountStatus[] = ['active', 'breached', 'passed', 'withdrawn', 'inactive'];
    const labels = ['Active', 'Breached', 'Passed', 'Withdrawn', 'Inactive'];

    statuses.forEach((status, idx) => {
      const account = { ...mockAccount, status };
      const { unmount } = render(
        <AccountCard
          account={account}
          isSelected={false}
          {...defaultHandlers}
        />
      );
      // Two badge elements exist (desktop + mobile), so use getAllByText
      expect(screen.getAllByText(labels[idx]).length).toBeGreaterThanOrEqual(1);
      unmount();
    });
  });

  it('renders with isSelected styling', () => {
    const { container } = render(
      <AccountCard
        account={mockAccount}
        isSelected={true}
        {...defaultHandlers}
      />
    );
    // When selected, the card should have the ring class
    expect(container.firstChild).toHaveClass('ring-1');
  });

  it('renders without isSelected styling', () => {
    const { container } = render(
      <AccountCard
        account={mockAccount}
        isSelected={false}
        {...defaultHandlers}
      />
    );
    expect(container.firstChild).not.toHaveClass('ring-1');
  });
});

describe('AccountCard - status badge colors and formatting', () => {
  const baseAccount: TradingAccount = {
    id: 'acc-1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge',
    status: 'active',
    balance: 110000,
    initialBalance: 100000,
    currency: 'USD',
    createdAt: '2024-01-15T00:00:00.000Z',
  };

  const defaultHandlers = {
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows correct status badge color for active status', () => {
    render(
      <AccountCard account={{ ...baseAccount, status: 'active' }} isSelected={false} {...defaultHandlers} />
    );
    // Two badge elements exist (desktop + mobile), grab the first
    const badge = screen.getAllByText('Active')[0];
    expect(badge).toHaveClass('bg-success/10');
    expect(badge).toHaveClass('text-success');
    expect(badge).toHaveClass('border-success/20');
  });

  it('shows correct status badge color for breached status', () => {
    render(
      <AccountCard account={{ ...baseAccount, status: 'breached' }} isSelected={false} {...defaultHandlers} />
    );
    const badge = screen.getAllByText('Breached')[0];
    expect(badge).toHaveClass('bg-destructive/10');
    expect(badge).toHaveClass('text-destructive');
    expect(badge).toHaveClass('border-destructive/20');
  });

  it('shows correct status badge color for passed status', () => {
    render(
      <AccountCard account={{ ...baseAccount, status: 'passed' }} isSelected={false} {...defaultHandlers} />
    );
    const badge = screen.getAllByText('Passed')[0];
    expect(badge).toHaveClass('bg-primary/10');
    expect(badge).toHaveClass('text-primary');
    expect(badge).toHaveClass('border-primary/20');
  });

  it('shows correct status badge color for withdrawn status', () => {
    render(
      <AccountCard account={{ ...baseAccount, status: 'withdrawn' }} isSelected={false} {...defaultHandlers} />
    );
    const badge = screen.getAllByText('Withdrawn')[0];
    expect(badge).toHaveClass('bg-warning/10');
    expect(badge).toHaveClass('text-warning');
    expect(badge).toHaveClass('border-warning/20');
  });

  it('shows correct status badge color for inactive status', () => {
    render(
      <AccountCard account={{ ...baseAccount, status: 'inactive' }} isSelected={false} {...defaultHandlers} />
    );
    const badge = screen.getAllByText('Inactive')[0];
    expect(badge).toHaveClass('bg-muted');
    expect(badge).toHaveClass('text-muted-foreground');
    expect(badge).toHaveClass('border-border');
  });

  it('renders balance formatted with currency', () => {
    const account = { ...baseAccount, balance: 250000, currency: 'EUR' };
    render(
      <AccountCard account={account} isSelected={false} {...defaultHandlers} />
    );
    expect(screen.getByText(`EUR ${(250000).toLocaleString()}`)).toBeInTheDocument();
  });

  it('handles zero balance', () => {
    const account = { ...baseAccount, balance: 0, initialBalance: 100000 };
    render(
      <AccountCard account={account} isSelected={false} {...defaultHandlers} />
    );
    expect(screen.getByText(`USD ${(0).toLocaleString()}`)).toBeInTheDocument();
    // P&L = 0 - 100000 = -100000
    const pnlText = `USD ${(-100000).toLocaleString()} (-100.00%)`;
    expect(screen.getByText(pnlText)).toBeInTheDocument();
  });

  it('renders broker name', () => {
    const account = { ...baseAccount, broker: 'Interactive Brokers' };
    render(
      <AccountCard account={account} isSelected={false} {...defaultHandlers} />
    );
    expect(screen.getByText('Interactive Brokers')).toBeInTheDocument();
  });
});
