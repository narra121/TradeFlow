import type { TradingAccount } from '@/types/trade';

/** Sentence shown wherever a read-only account blocks an edit. */
export const READ_ONLY_REASON = 'Your free trial has ended, so your journal is read-only. Upgrade to Pro to add, edit or delete.';

/**
 * Accounts the user cannot write to: every account while the plan is read-only (`writable` is `[]`). `writable` is
 * `null` on trial and Pro (or before entitlements load): nothing is read-only then.
 */
export function readOnlyAccountIds(accounts: Pick<TradingAccount, 'id'>[], writable: string[] | null | undefined): Set<string> {
  if (!writable) return new Set();
  return new Set(accounts.filter((a) => !writable.includes(a.id)).map((a) => a.id));
}
