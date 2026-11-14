import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { readOnlyAccountIds } from '@/lib/accountWritable';

/** Ids of the accounts whose trades cannot be edited: all of them while the plan is read-only. */
export function useReadOnlyAccounts(): ReadonlySet<string> {
  const { accounts } = useAccounts();
  const { writableAccountIds } = useEntitlements();
  return useMemo(() => readOnlyAccountIds(accounts, writableAccountIds), [accounts, writableAccountIds]);
}
