import { describe, expect, it } from 'vitest';
import { lastTradeText, netSinceStart, sortAccounts, statusSummary, totalsByCurrency } from '../accountStats';
import type { TradingAccount } from '@/types/trade';

const acc = (id: string, over: Partial<TradingAccount> = {}): TradingAccount =>
  ({ id, name: id, broker: 'B', type: 'personal', status: 'active', balance: 1000, initialBalance: 1000, currency: 'USD', createdAt: '', ...over }) as TradingAccount;

describe('account figures', () => {
  it('computes net since start and a percentage that is absent for a zero start', () => {
    expect(netSinceStart(acc('a', { balance: 1240, initialBalance: 1000 }))).toEqual({ amount: 240, pct: 24 });
    expect(netSinceStart(acc('a', { balance: 50, initialBalance: 0 }))).toEqual({ amount: 50, pct: null });
  });

  it('never adds two currencies together', () => {
    const totals = totalsByCurrency([acc('a', { balance: 101240, initialBalance: 100000 }), acc('b', { currency: 'INR', balance: 482300, initialBalance: 500000 }), acc('c', { balance: 10, initialBalance: 5 })]);
    expect(totals).toEqual([
      { currency: 'USD', count: 2, balance: 101250, net: 1245 },
      { currency: 'INR', count: 1, balance: 482300, net: -17700 },
    ]);
  });

  it('words the last trade as recency up to a week, then as a date', () => {
    const now = new Date(2026, 10, 11, 15);
    expect(lastTradeText('2026-11-11', now)).toBe('today');
    expect(lastTradeText('2026-11-10', now)).toBe('yesterday');
    expect(lastTradeText('2026-11-09', now)).toBe('2 days ago');
    expect(lastTradeText('2026-10-23', now)).toBe('23 Oct 2026');
    expect(lastTradeText(undefined, now)).toBe('—');
    expect(lastTradeText(null, now)).toBe('—');
  });

  it('sorts inside a group by any column and breaks ties by name', () => {
    const list = [acc('b', { balance: 5 }), acc('a', { balance: 5, tradeCount: 3, lastTradeDate: '2026-10-01' }), acc('c', { balance: 9, tradeCount: 7, lastTradeDate: '2026-11-02' })];
    expect(sortAccounts(list, 'balance', 'desc').map((a) => a.id)).toEqual(['c', 'a', 'b']);
    expect(sortAccounts(list, 'name', 'asc').map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(sortAccounts(list, 'trades', 'desc').map((a) => a.id)).toEqual(['c', 'a', 'b']);
    expect(sortAccounts(list, 'last', 'desc').map((a) => a.id)).toEqual(['c', 'a', 'b']);
    expect(sortAccounts(list, 'last', 'asc').map((a) => a.id)).toEqual(['b', 'a', 'c']);
  });

  it('summarises the folded group by status', () => {
    expect(statusSummary([acc('a', { status: 'passed' }), acc('b', { status: 'breached' }), acc('c', { status: 'passed' })], { passed: 'Passed', breached: 'Breached' })).toBe('Passed 2 · Breached 1');
  });
});
