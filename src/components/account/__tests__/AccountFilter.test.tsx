import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { AccountFilter } from '../AccountFilter';

// Polyfill pointer capture methods for Radix UI Select in jsdom
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// Mock the useAccounts hook
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: 'acc-1',
        name: 'FTMO Challenge',
        broker: 'FTMO',
        type: 'prop_challenge' as const,
        status: 'active' as const,
        balance: 100000,
        initialBalance: 100000,
        currency: 'USD',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'acc-2',
        name: 'Personal Account',
        broker: 'Interactive Brokers',
        type: 'personal' as const,
        status: 'active' as const,
        balance: 50000,
        initialBalance: 50000,
        currency: 'USD',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    selectedAccountId: null,
    selectedAccount: null,
    setSelectedAccountId: vi.fn(),
  }),
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
}));

describe('AccountFilter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<AccountFilter />);
    expect(screen.getByText('Account:')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    renderWithProviders(<AccountFilter showLabel={false} />);
    expect(screen.queryByText('Account:')).not.toBeInTheDocument();
  });

  it('shows "All Accounts" as default selection', () => {
    renderWithProviders(<AccountFilter />);
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
  });

  it('renders a combobox trigger element', () => {
    renderWithProviders(<AccountFilter />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <AccountFilter className="my-custom-class" />
    );
    expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
  });

  it('truncates long account names with CSS truncate class', () => {
    renderWithProviders(<AccountFilter />);
    // The trigger text container should have truncate class for overflow handling
    const trigger = screen.getByRole('combobox');
    const truncatedSpan = trigger.querySelector('.truncate');
    expect(truncatedSpan).toBeInTheDocument();
  });
});
