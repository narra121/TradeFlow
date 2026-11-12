import type { TradingAccount } from '@/types/trade';

/** Sentence shown wherever a read-only account blocks an edit (B-111). */
export const READ_ONLY_REASON = 'This account is read-only on Free. Choose your two writable accounts in Plan & billing.';

/**
 * Accounts a Free user cannot write to after a trial ended with more than two accounts. `writable` is
 * `null` when the plan has no such limit (or entitlements have not loaded): nothing is read-only then.
 */
export function readOnlyAccountIds(accounts: Pick<TradingAccount, 'id'>[], writable: string[] | null | undefined): Set<string> {
  if (!writable) return new Set();
  return new Set(accounts.filter((a) => !writable.includes(a.id)).map((a) => a.id));
}
