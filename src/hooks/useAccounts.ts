import { useEffect, useRef } from 'react';
import { TradingAccount, AccountStatus, AccountType } from '@/types/trade';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchAccounts, 
  createAccount, 
  updateAccount as updateAccountAction, 
  deleteAccount as deleteAccountAction,
  updateAccountStatus as updateAccountStatusAction,
  setSelectedAccount as setSelectedAccountAction
} from '@/store/slices/accountsSlice';

export function useAccounts() {
  const dispatch = useAppDispatch();
  const { accounts, selectedAccountId, loading, error } = useAppSelector((state) => state.accounts);
  const hasFetchedRef = useRef(false);

  // Fetch accounts only once on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(fetchAccounts());
    }
  }, [dispatch]);

  const addAccount = async (account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    const result = await dispatch(createAccount(account)).unwrap();
    return result;
  };

  const updateAccount = async (id: string, updates: Partial<Omit<TradingAccount, 'id' | 'createdAt'>>) => {
    await dispatch(updateAccountAction({ id, payload: updates })).unwrap();
  };

  const updateAccountStatus = async (id: string, status: AccountStatus) => {
    await dispatch(updateAccountStatusAction({ id, status })).unwrap();
  };

  const deleteAccount = async (id: string) => {
    await dispatch(deleteAccountAction(id)).unwrap();
  };

  const setSelectedAccountId = (id: string | null) => {
    dispatch(setSelectedAccountAction(id));
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || null;

  return {
    accounts,
    selectedAccountId,
    selectedAccount,
    setSelectedAccountId,
    addAccount,
    updateAccount,
    updateAccountStatus,
    deleteAccount,
  };
}

export const accountTypeLabels: Record<AccountType, string> = {
  prop_challenge: 'Prop Challenge',
  prop_funded: 'Funded Account',
  personal: 'Personal',
  demo: 'Demo',
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  breached: 'Breached',
  passed: 'Passed',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
};

export const accountStatusColors: Record<AccountStatus, string> = {
  active: 'bg-success/10 text-success border-success/20',
  breached: 'bg-destructive/10 text-destructive border-destructive/20',
  passed: 'bg-primary/10 text-primary border-primary/20',
  withdrawn: 'bg-warning/10 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};
