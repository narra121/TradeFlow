import { appToday } from '@/lib/appTimeZone';
import { parseLocalDate } from '@/lib/format';
import type { TradingAccount } from '@/types/trade';
import { isCurrentPeriod, periodOf, previousPeriods, type GoalPeriod, type PeriodRef } from './goalMath';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `?period=month` shows months; anything else weeks. */
export function goalsPeriodType(param: string | null): GoalPeriod {
  return param === 'month' ? 'monthly' : 'weekly';
}

/** The day `?on=` names, or today. */
export function goalsAnchor(param: string | null): Date {
  return param && ISO_DATE.test(param) ? parseLocalDate(param) : appToday();
}

/** Goals are tracked for the selected account, else for every active one. */
export function goalsScope(accounts: TradingAccount[], selectedAccount: TradingAccount | null) {
  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const currencies = [...new Set((selectedAccount ? [selectedAccount] : activeAccounts).map((a) => a.currency || 'USD'))];
  return {
    activeAccounts,
    currencies,
    needAccount: !selectedAccount && currencies.length > 1,
    scopeId: selectedAccount ? selectedAccount.id : 'ALL',
    totalCapital: selectedAccount ? selectedAccount.initialBalance || 0 : activeAccounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0),
  };
}

export type GoalsScope = ReturnType<typeof goalsScope>;

/**
 * The requests GoalsView makes for a period; shell/prefetchPage.ts makes the same ones before a visit. `accountsUnready`:
 * the account list is loading or empty.
 */
export function goalsQueries(ref: PeriodRef, scope: GoalsScope, accountsUnready: boolean) {
  const live = isCurrentPeriod(ref);
  const siblingRef = periodOf(ref.period === 'weekly' ? 'monthly' : 'weekly', ref.start);
  return {
    live,
    rulesGoals: { periodKey: ref.key, currentPeriod: live },
    sibling: { periodKey: siblingRef.key, currentPeriod: false },
    progress: { accountId: scope.scopeId, startDate: ref.startDate, endDate: ref.endDate, period: ref.period, periodKey: ref.key, currentPeriod: live, totalCapital: scope.totalCapital },
    progressSkip: accountsUnready || scope.needAccount,
    trades: { accountId: scope.scopeId, startDate: previousPeriods(ref)[0].startDate, endDate: ref.endDate },
    tradesSkip: accountsUnready,
  };
}
