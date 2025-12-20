import { useEffect, useRef } from 'react';
import { TradingAccount, AccountStatus, AccountType } from '@/types/trade';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedAccount as setSelectedAccountAction } from '@/store/slices/accountsSlice';
import { useGetAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation, useUpdateAccountStatusMutation } from '@/store/api';

export function useAccounts() {
  const dispatch = useAppDispatch();
  const { selectedAccountId } = useAppSelector((state) => state.accounts || {});
  const { data: accountsData, isLoading: loading, error } = useGetAccountsQuery();
  const [createAccountMutation] = useCreateAccountMutation();
  const [updateAccountMutation] = useUpdateAccountMutation();
  const [deleteAccountMutation] = useDeleteAccountMutation();
  const [updateAccountStatusMutation] = useUpdateAccountStatusMutation();

  const accounts = accountsData?.accounts || [];

  const addAccount = async (account: Omit<TradingAccount, 'id' | 'createdAt'>) => {
    const result = await createAccountMutation(account).unwrap();
    return result;
  };

  const updateAccount = async (id: string, updates: Partial<Omit<TradingAccount, 'id' | 'createdAt'>>) => {
    await updateAccountMutation({ id, payload: updates }).unwrap();
  };

  const updateAccountStatus = async (id: string, status: AccountStatus) => {
    await updateAccountStatusMutation({ id, status }).unwrap();
  };

  const deleteAccount = async (id: string) => {
    await deleteAccountMutation(id).unwrap();
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
