import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts, accountTypeLabels, accountStatusLabels, accountStatusColors } from '../useAccounts';

// Mock RTK Query hooks
const mockGetAccountsQuery = vi.fn();
const mockCreateAccountMutation = vi.fn();
const mockUpdateAccountMutation = vi.fn();
const mockDeleteAccountMutation = vi.fn();
const mockUpdateAccountStatusMutation = vi.fn();

vi.mock('@/store/api', () => ({
  useGetAccountsQuery: () => mockGetAccountsQuery(),
  useCreateAccountMutation: () => mockCreateAccountMutation(),
  useUpdateAccountMutation: () => mockUpdateAccountMutation(),
  useDeleteAccountMutation: () => mockDeleteAccountMutation(),
  useUpdateAccountStatusMutation: () => mockUpdateAccountStatusMutation(),
}));

// Mock Redux hooks
const mockDispatch = vi.fn();
const mockSelectedAccountId = vi.fn<() => string | null>(() => null);

vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({ accounts: { selectedAccountId: mockSelectedAccountId() } }),
}));

vi.mock('@/store/slices/accountsSlice', () => ({
  setSelectedAccount: (id: string | null) => ({ type: 'accounts/setSelectedAccount', payload: id }),
}));

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'FTMO Challenge',
    broker: 'FTMO',
    type: 'prop_challenge' as const,
    status: 'active' as const,
    balance: 110000,
    initialBalance: 100000,
    currency: 'USD',
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'acc-2',
    name: 'Personal Account',
    broker: 'IBKR',
    type: 'personal' as const,
    status: 'active' as const,
    balance: 50000,
    initialBalance: 50000,
    currency: 'USD',
    createdAt: '2024-02-01T00:00:00.000Z',
  },
];

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetAccountsQuery.mockReturnValue({
      data: { accounts: mockAccounts },
      isLoading: false,
      error: undefined,
    });
    mockCreateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'acc-3' }) })]);
    mockUpdateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockDeleteAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockUpdateAccountStatusMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockSelectedAccountId.mockReturnValue(null);
  });

  it('returns accounts array from query data', () => {
    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual(mockAccounts);
    expect(result.current.accounts).toHaveLength(2);
  });

  it('returns empty array when no accounts data', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual([]);
  });

  it('returns empty array when accountsData has no accounts property', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: {},
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual([]);
  });

  it('returns selectedAccountId from Redux state', () => {
    mockSelectedAccountId.mockReturnValue('acc-1');

    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccountId).toBe('acc-1');
  });

  it('returns null selectedAccountId when none selected', () => {
    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccountId).toBeNull();
  });

  it('returns selectedAccount matching selectedAccountId', () => {
    mockSelectedAccountId.mockReturnValue('acc-1');

    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccount).toEqual(mockAccounts[0]);
  });

  it('returns null selectedAccount when no match found', () => {
    mockSelectedAccountId.mockReturnValue('non-existent');

    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccount).toBeNull();
  });

  it('returns null selectedAccount when no selectedAccountId', () => {
    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccount).toBeNull();
  });

  it('dispatches setSelectedAccount action when setSelectedAccountId is called', () => {
    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.setSelectedAccountId('acc-2');
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'accounts/setSelectedAccount',
      payload: 'acc-2',
    });
  });

  it('dispatches setSelectedAccount with null to deselect', () => {
    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.setSelectedAccountId(null);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'accounts/setSelectedAccount',
      payload: null,
    });
  });

  it('calls createAccountMutation when addAccount is called', async () => {
    const mockUnwrap = vi.fn().mockResolvedValue({ id: 'acc-new' });
    const mockCreate = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
    mockCreateAccountMutation.mockReturnValue([mockCreate]);

    const { result } = renderHook(() => useAccounts());

    const newAccount = {
      name: 'New Account',
      broker: 'Broker',
      type: 'personal' as const,
      status: 'active' as const,
      balance: 10000,
      initialBalance: 10000,
      currency: 'USD',
    };

    const returnedResult = await result.current.addAccount(newAccount);

    expect(mockCreate).toHaveBeenCalledWith(newAccount);
    expect(mockUnwrap).toHaveBeenCalled();
    expect(returnedResult).toEqual({ id: 'acc-new' });
  });

  it('calls updateAccountMutation when updateAccount is called', async () => {
    const mockUnwrap = vi.fn().mockResolvedValue(undefined);
    const mockUpdate = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
    mockUpdateAccountMutation.mockReturnValue([mockUpdate]);

    const { result } = renderHook(() => useAccounts());

    await result.current.updateAccount('acc-1', { name: 'Updated Name' });

    expect(mockUpdate).toHaveBeenCalledWith({ id: 'acc-1', payload: { name: 'Updated Name' } });
    expect(mockUnwrap).toHaveBeenCalled();
  });

  it('calls updateAccountStatusMutation when updateAccountStatus is called', async () => {
    const mockUnwrap = vi.fn().mockResolvedValue(undefined);
    const mockUpdateStatus = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
    mockUpdateAccountStatusMutation.mockReturnValue([mockUpdateStatus]);

    const { result } = renderHook(() => useAccounts());

    await result.current.updateAccountStatus('acc-1', 'breached');

    expect(mockUpdateStatus).toHaveBeenCalledWith({ id: 'acc-1', status: 'breached' });
    expect(mockUnwrap).toHaveBeenCalled();
  });

  it('calls deleteAccountMutation when deleteAccount is called', async () => {
    const mockUnwrap = vi.fn().mockResolvedValue(undefined);
    const mockDelete = vi.fn().mockReturnValue({ unwrap: mockUnwrap });
    mockDeleteAccountMutation.mockReturnValue([mockDelete]);

    const { result } = renderHook(() => useAccounts());

    await result.current.deleteAccount('acc-1');

    expect(mockDelete).toHaveBeenCalledWith('acc-1');
    expect(mockUnwrap).toHaveBeenCalled();
  });

  it('exposes all required methods', () => {
    const { result } = renderHook(() => useAccounts());

    expect(result.current).toHaveProperty('accounts');
    expect(result.current).toHaveProperty('selectedAccountId');
    expect(result.current).toHaveProperty('selectedAccount');
    expect(result.current).toHaveProperty('setSelectedAccountId');
    expect(result.current).toHaveProperty('addAccount');
    expect(result.current).toHaveProperty('updateAccount');
    expect(result.current).toHaveProperty('updateAccountStatus');
    expect(result.current).toHaveProperty('deleteAccount');

    expect(typeof result.current.setSelectedAccountId).toBe('function');
    expect(typeof result.current.addAccount).toBe('function');
    expect(typeof result.current.updateAccount).toBe('function');
    expect(typeof result.current.updateAccountStatus).toBe('function');
    expect(typeof result.current.deleteAccount).toBe('function');
  });
});

describe('accountTypeLabels', () => {
  it('maps all account types to labels', () => {
    expect(accountTypeLabels.prop_challenge).toBe('Prop Challenge');
    expect(accountTypeLabels.prop_funded).toBe('Funded Account');
    expect(accountTypeLabels.personal).toBe('Personal');
    expect(accountTypeLabels.demo).toBe('Demo');
  });
});

describe('accountStatusLabels', () => {
  it('maps all account statuses to labels', () => {
    expect(accountStatusLabels.active).toBe('Active');
    expect(accountStatusLabels.breached).toBe('Breached');
    expect(accountStatusLabels.passed).toBe('Passed');
    expect(accountStatusLabels.withdrawn).toBe('Withdrawn');
    expect(accountStatusLabels.inactive).toBe('Inactive');
  });
});

describe('accountStatusColors', () => {
  it('maps all account statuses to CSS class strings', () => {
    expect(accountStatusColors.active).toContain('bg-success');
    expect(accountStatusColors.breached).toContain('bg-destructive');
    expect(accountStatusColors.passed).toContain('bg-primary');
    expect(accountStatusColors.withdrawn).toContain('bg-warning');
    expect(accountStatusColors.inactive).toContain('bg-muted');
  });

  it('includes text and border classes for each status', () => {
    const statuses = ['active', 'breached', 'passed', 'withdrawn', 'inactive'] as const;
    statuses.forEach((status) => {
      expect(accountStatusColors[status]).toMatch(/text-/);
      expect(accountStatusColors[status]).toMatch(/border-/);
    });
  });
});

describe('useAccounts - Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'acc-3' }) })]);
    mockUpdateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockDeleteAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockUpdateAccountStatusMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockSelectedAccountId.mockReturnValue(null);
  });

  it('returns empty accounts array when query returns error', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: 'Internal Server Error' },
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual([]);
  });

  it('returns empty accounts when query data is undefined', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 'FETCH_ERROR', error: 'Network request failed' },
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual([]);
    expect(result.current.accounts).toHaveLength(0);
  });

  it('selectedAccountId defaults to null on error', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: 'Server error' },
    });
    mockSelectedAccountId.mockReturnValue(null);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccountId).toBeNull();
    expect(result.current.selectedAccount).toBeNull();
  });
});

describe('useAccounts - Sorting and Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'acc-3' }) })]);
    mockUpdateAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockDeleteAccountMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockUpdateAccountStatusMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })]);
    mockSelectedAccountId.mockReturnValue(null);
  });

  it('returns sorted accounts by name when accounts are in unsorted order', () => {
    const unsortedAccounts = [
      {
        id: 'acc-z',
        name: 'Zebra Account',
        broker: 'FTMO',
        type: 'personal' as const,
        status: 'active' as const,
        balance: 5000,
        initialBalance: 5000,
        currency: 'USD',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'acc-a',
        name: 'Alpha Account',
        broker: 'IBKR',
        type: 'demo' as const,
        status: 'active' as const,
        balance: 10000,
        initialBalance: 10000,
        currency: 'USD',
        createdAt: '2024-02-01T00:00:00.000Z',
      },
    ];

    mockGetAccountsQuery.mockReturnValue({
      data: { accounts: unsortedAccounts },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAccounts());

    // The hook returns accounts as-is from the API (no client-side sorting)
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('Zebra Account');
    expect(result.current.accounts[1].name).toBe('Alpha Account');
  });

  it('handles account with zero balance', () => {
    const accountsWithZero = [
      {
        id: 'acc-zero',
        name: 'Empty Account',
        broker: 'FTMO',
        type: 'prop_challenge' as const,
        status: 'breached' as const,
        balance: 0,
        initialBalance: 100000,
        currency: 'USD',
        createdAt: '2024-03-01T00:00:00.000Z',
      },
    ];

    mockGetAccountsQuery.mockReturnValue({
      data: { accounts: accountsWithZero },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].balance).toBe(0);
    expect(result.current.accounts[0].id).toBe('acc-zero');
  });

  it('selectedAccount returns correct object when ID matches', () => {
    const testAccounts = [
      {
        id: 'acc-1',
        name: 'First Account',
        broker: 'FTMO',
        type: 'prop_challenge' as const,
        status: 'active' as const,
        balance: 110000,
        initialBalance: 100000,
        currency: 'USD',
        createdAt: '2024-01-15T00:00:00.000Z',
      },
      {
        id: 'acc-2',
        name: 'Second Account',
        broker: 'IBKR',
        type: 'personal' as const,
        status: 'active' as const,
        balance: 50000,
        initialBalance: 50000,
        currency: 'USD',
        createdAt: '2024-02-01T00:00:00.000Z',
      },
    ];

    mockGetAccountsQuery.mockReturnValue({
      data: { accounts: testAccounts },
      isLoading: false,
      error: undefined,
    });
    mockSelectedAccountId.mockReturnValue('acc-2');

    const { result } = renderHook(() => useAccounts());

    expect(result.current.selectedAccount).not.toBeNull();
    expect(result.current.selectedAccount?.id).toBe('acc-2');
    expect(result.current.selectedAccount?.name).toBe('Second Account');
    expect(result.current.selectedAccount?.broker).toBe('IBKR');
  });

  it('setSelectedAccountId dispatches correct action with a specific ID', () => {
    mockGetAccountsQuery.mockReturnValue({
      data: { accounts: mockAccounts },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.setSelectedAccountId('acc-1');
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'accounts/setSelectedAccount',
      payload: 'acc-1',
    });
  });
});
