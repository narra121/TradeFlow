import { useMemo } from 'react';
import { useGetAccountsQuery } from '@/store/api/accountsApi';
import { useGetRulesAndGoalsQuery } from '@/store/api/goalsRulesApi';

export interface GettingStarted {
  isLoading: boolean;
  /** A request it depends on failed, or the trade count is not known: the progress must not be shown. */
  unknown: boolean;
  hasAccount: boolean;
  hasTrade: boolean;
  /** A goal the user edited or a rule the user added; the server's starter set does not count. */
  hasGoalOrRule: boolean;
  done: number;
  total: 3;
  complete: boolean;
}

interface Stamped {
  createdAt?: string;
  updatedAt?: string;
}

const STARTER_WINDOW_MS = 60_000;

/** True when the item was changed after the server created it, or was created well after the first starter item. */
export function userSetItems(items: Stamped[]): boolean {
  const created = items.map((i) => new Date(i.createdAt ?? '').getTime()).filter((t) => !Number.isNaN(t));
  const first = created.length ? Math.min(...created) : null;
  return items.some((i) => {
    const c = new Date(i.createdAt ?? '').getTime();
    const u = new Date(i.updatedAt ?? '').getTime();
    if (Number.isNaN(c)) return false;
    return (!Number.isNaN(u) && u - c > STARTER_WINDOW_MS) || (first !== null && c - first > STARTER_WINDOW_MS);
  });
}

/**
 * Progress of the three first-run steps, derived from data and never stored (A.11): an account exists, a trade exists,
 * the user set a goal or rule. `tradeCount` is the whole-journal count the caller already knows; null while it is loading
 * or failed to load.
 */
export function useGettingStarted(tradeCount: number | null): GettingStarted {
  const accounts = useGetAccountsQuery();
  const rg = useGetRulesAndGoalsQuery();
  return useMemo(() => {
    const hasAccount = (accounts.data?.accounts.length ?? 0) > 0;
    const hasTrade = (tradeCount ?? 0) > 0;
    const hasGoalOrRule = !!rg.data && (userSetItems(rg.data.goals) || userSetItems(rg.data.rules));
    const done = Number(hasAccount) + Number(hasTrade) + Number(hasGoalOrRule);
    const unknown = accounts.isError || rg.isError || tradeCount === null;
    return { isLoading: accounts.isLoading, unknown, hasAccount, hasTrade, hasGoalOrRule, done, total: 3 as const, complete: done === 3 };
  }, [accounts.data, accounts.isLoading, accounts.isError, rg.data, rg.isError, tradeCount]);
}
