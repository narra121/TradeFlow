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
    expect(screen.getByText('Active')).toBeInTheDocument();
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
      expect(screen.getByText(labels[idx])).toBeInTheDocument();
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
