import { differenceInCalendarDays } from 'date-fns';
import { appToday } from '@/lib/appTimeZone';
import { formatDateShort, parseLocalDate } from '@/lib/format';
import type { TradingAccount } from '@/types/trade';

/** `today`, `2 days ago` up to a week, then the date. */
export function lastTradeText(day: string | null | undefined, now: Date = new Date()): string {
  if (!day) return '—';
  const days = differenceInCalendarDays(appToday(now), parseLocalDate(day));
  if (Number.isNaN(days)) return '—';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 7) return `${days} days ago`;
  return formatDateShort(day, true);
}

export function netSinceStart(a: TradingAccount): { amount: number; pct: number | null } {
  const amount = (a.balance ?? 0) - (a.initialBalance ?? 0);
  return { amount, pct: a.initialBalance > 0 ? (amount / a.initialBalance) * 100 : null };
}

export interface CurrencyTotal {
  currency: string;
  count: number;
  balance: number;
  net: number;
}

/** One line per currency; balances in different currencies are never added together. */
export function totalsByCurrency(accounts: TradingAccount[]): CurrencyTotal[] {
  const map = new Map<string, CurrencyTotal>();
  for (const a of accounts) {
    const currency = a.currency || 'USD';
    const row = map.get(currency) ?? { currency, count: 0, balance: 0, net: 0 };
    row.count += 1;
    row.balance += a.balance ?? 0;
    row.net += netSinceStart(a).amount;
    map.set(currency, row);
  }
  return [...map.values()].sort((x, y) => y.count - x.count);
}

export type AccountSortId = 'name' | 'broker' | 'balance' | 'net' | 'trades' | 'last';

export function sortAccounts(list: TradingAccount[], id: AccountSortId, dir: 'asc' | 'desc'): TradingAccount[] {
  const value = (a: TradingAccount): number | string => {
    switch (id) {
      case 'name':
        return a.name.toLowerCase();
      case 'broker':
        return (a.broker ?? '').toLowerCase();
      case 'balance':
        return a.balance ?? 0;
      case 'net':
        return netSinceStart(a).amount;
      case 'trades':
        return a.tradeCount ?? 0;
      case 'last':
        return a.lastTradeDate ?? '';
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...list].sort((x, y) => {
    const a = value(x);
    const b = value(y);
    return (a < b ? -1 : a > b ? 1 : 0) * sign || x.name.localeCompare(y.name);
  });
}

export function statusSummary(accounts: TradingAccount[], label: Record<string, string>): string {
  const counts = new Map<string, number>();
  for (const a of accounts) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  return [...counts].map(([s, n]) => `${label[s] ?? s} ${n}`).join(' · ');
}
