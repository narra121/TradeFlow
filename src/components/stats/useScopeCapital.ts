import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useGetAccountsQuery } from '@/store/api';

/** Starting balance of the accounts in scope: the denominator of the drawdown percentage. */
export function useScopeCapital() {
  const { accounts, selectedAccountId } = useAccounts();
  const { isLoading: accountsLoading, isError: accountsError } = useGetAccountsQuery();
  const totalCapital = useMemo(() => {
    const pool = selectedAccountId ? accounts.filter((a) => a.id === selectedAccountId) : accounts.filter((a) => a.id && a.id !== '-1');
    return pool.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  }, [accounts, selectedAccountId]);
  return { accounts, selectedAccountId, totalCapital, accountsReady: accounts.length > 0, accountsLoading, accountsError };
}
