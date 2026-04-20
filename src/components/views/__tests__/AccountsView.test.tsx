import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { AccountsView } from '../AccountsView';

// --- Mock data ---
const mockAccounts = [
  {
    id: '1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge' as const,
    status: 'active' as const,
    initialBalance: 100000,
    balance: 105000,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Personal Live',
    broker: 'IC Markets',
    type: 'personal' as const,
    status: 'active' as const,
    initialBalance: 5000,
    balance: 5500,
    createdAt: '2024-02-01',
  },
];

// --- Mocks ---
vi.mock('@/store/api', () => ({
  useGetAccountsQuery: vi.fn(() => ({
    data: { accounts: mockAccounts },
    isLoading: false,
    isFetching: false,
  })),
  useCreateAccountMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUpdateAccountMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useDeleteAccountMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
  useUpdateAccountStatusMutation: vi.fn(() => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }),
  ]),
}));

// Mock child components that use their own hooks/api calls
vi.mock('@/components/account/AccountCard', () => ({
  AccountCard: ({ account }: any) => (
    <div data-testid="account-card">
      <span>{account.name}</span>
    </div>
  ),
}));

vi.mock('@/components/account/AddAccountModal', () => ({
  AddAccountModal: ({ open }: any) =>
    open ? <div data-testid="add-account-modal">AddAccountModal</div> : null,
}));

import { useGetAccountsQuery } from '@/store/api';

describe('AccountsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: { accounts: mockAccounts },
      isLoading: false,
      isFetching: false,
    } as any);
  });

  it('renders "Accounts" heading', () => {
    render(<AccountsView />);
    expect(screen.getByRole('heading', { name: /accounts/i, level: 1 })).toBeInTheDocument();
  });

  it('shows account cards', () => {
    render(<AccountsView />);
    const cards = screen.getAllByTestId('account-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('FTMO Challenge')).toBeInTheDocument();
    expect(screen.getByText('Personal Live')).toBeInTheDocument();
  });

  it('shows Add Account button in header', () => {
    render(<AccountsView />);
    expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
  });

  it('shows summary stats when accounts exist', () => {
    render(<AccountsView />);
    expect(screen.getByText('Total Accounts')).toBeInTheDocument();
    expect(screen.getByText('Combined Balance')).toBeInTheDocument();
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
  });

  it('shows the "Add New Account" card', () => {
    render(<AccountsView />);
    expect(screen.getByText('Add New Account')).toBeInTheDocument();
  });

  it('shows empty state when no accounts', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: { accounts: [] },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<AccountsView />);

    // No account cards should render
    expect(screen.queryAllByTestId('account-card')).toHaveLength(0);
    // The empty state heading and button should be visible
    expect(screen.getByText('Set up your first trading account')).toBeInTheDocument();
    // Both header and empty state show "Add Account" buttons
    const addButtons = screen.getAllByRole('button', { name: /add account/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading skeletons only on initial load, not background refetch', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    } as any);

    render(<AccountsView />);

    expect(screen.getByRole('heading', { name: /accounts/i, level: 1 })).toBeInTheDocument();
    expect(screen.queryAllByTestId('account-card')).toHaveLength(0);
  });

  it('keeps stale data visible during background refetch', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: { accounts: mockAccounts },
      isLoading: false,
      isFetching: true,
    } as any);

    render(<AccountsView />);

    const cards = screen.getAllByTestId('account-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('FTMO Challenge')).toBeInTheDocument();
  });
});

describe('AccountsView - Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header and "Add Account" button when API returns an error', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 500, data: 'Internal Server Error' },
    } as any);

    render(<AccountsView />);

    expect(screen.getByRole('heading', { name: /accounts/i, level: 1 })).toBeInTheDocument();
    // Both header and empty state may show "Add Account" buttons
    const addButtons = screen.getAllByRole('button', { name: /add account/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when accounts data is an empty array', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: { accounts: [] },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<AccountsView />);

    expect(screen.queryAllByTestId('account-card')).toHaveLength(0);
    expect(screen.getByText('Set up your first trading account')).toBeInTheDocument();
    expect(screen.getByText('Total Accounts')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useGetAccountsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    } as any);

    render(<AccountsView />);

    expect(screen.getByRole('heading', { name: /accounts/i, level: 1 })).toBeInTheDocument();
    expect(screen.queryAllByTestId('account-card')).toHaveLength(0);
    // The "Add New Account" card should not appear during loading (replaced by skeletons)
    expect(screen.queryByText('Add New Account')).not.toBeInTheDocument();
  });
});
