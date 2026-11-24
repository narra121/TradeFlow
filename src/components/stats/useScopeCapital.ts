import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useGetAccountsQuery } from '@/store/api';
import { accountCurrency } from '@/lib/format';
import type { TradingAccount } from '@/types/trade';

/**
 * Whether a drawdown percentage means anything for the accounts in scope: `mixed` when they hold different currencies (their
 * balances cannot be added), `balance` when one of them has no starting balance (the percentage would read near 100%).
 */
export type DrawdownBasis = 'ok' | 'mixed' | 'balance';

export function drawdownBasis(pool: Pick<TradingAccount, 'currency' | 'initialBalance'>[]): DrawdownBasis {
  if (new Set(pool.map(accountCurrency)).size > 1) return 'mixed';
  if (pool.some((a) => !(a.initialBalance > 0))) return 'balance';
  return 'ok';
}

/** The accounts in scope (the selected one, else every account) and their starting balance: the denominator of the drawdown percentage. */
export function scopeCapital(accounts: TradingAccount[], selectedAccountId: string | null) {
  const pool = selectedAccountId ? accounts.filter((a) => a.id === selectedAccountId) : accounts.filter((a) => a.id && a.id !== '-1');
  return { pool, totalCapital: pool.reduce((sum, a) => sum + (a.initialBalance || 0), 0) };
}

export function useScopeCapital() {
  const { accounts, selectedAccountId } = useAccounts();
  const { isLoading: accountsLoading, isError: accountsError, error: accountsErrorDetail } = useGetAccountsQuery();
  const { pool, totalCapital } = useMemo(() => scopeCapital(accounts, selectedAccountId), [accounts, selectedAccountId]);
  const basis = useMemo(() => drawdownBasis(pool), [pool]);
  return { accounts, selectedAccountId, totalCapital, drawdownBasis: basis, accountsReady: accounts.length > 0, accountsLoading, accountsError, accountsErrorDetail };
}
