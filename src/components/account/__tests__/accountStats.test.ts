import { describe, expect, it } from 'vitest';
import { lastTradeText, netSinceStart, sortAccounts, statusSummary, tallyByAccount, totalsByCurrency } from '../accountStats';
import type { Trade, TradingAccount } from '@/types/trade';

const acc = (id: string, over: Partial<TradingAccount> = {}): TradingAccount =>
  ({ id, name: id, broker: 'B', type: 'personal', status: 'active', balance: 1000, initialBalance: 1000, currency: 'USD', createdAt: '', ...over }) as TradingAccount;
const trade = (id: string, accountId: string | undefined, exit: string): Trade => ({ id, accountId, exitDate: exit, entryDate: exit }) as Trade;

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

  it('tallies trades and the latest exit per account and skips trades without an account', () => {
    const t = tallyByAccount([trade('1', 'a', '2026-11-02T10:00:00Z'), trade('2', 'a', '2026-11-05T10:00:00Z'), trade('3', 'b', '2026-10-01T10:00:00Z'), trade('4', undefined, '2026-11-09T10:00:00Z')]);
    expect(t.get('a')).toEqual({ trades: 2, lastTradeAt: '2026-11-05T10:00:00Z' });
    expect(t.get('b')?.trades).toBe(1);
    expect(t.size).toBe(2);
  });

  it('words the last trade as recency up to a week, then as a date', () => {
    const now = new Date(2026, 10, 11, 15);
    expect(lastTradeText(new Date(2026, 10, 11, 9).toISOString(), now)).toBe('today');
    expect(lastTradeText(new Date(2026, 10, 10, 9).toISOString(), now)).toBe('yesterday');
    expect(lastTradeText(new Date(2026, 10, 9, 9).toISOString(), now)).toBe('2 days ago');
    expect(lastTradeText(new Date(2026, 9, 23, 9).toISOString(), now)).toBe('23 Oct 2026');
    expect(lastTradeText(undefined, now)).toBe('—');
  });

  it('sorts inside a group by any column and breaks ties by name', () => {
    const list = [acc('b', { balance: 5 }), acc('a', { balance: 5 }), acc('c', { balance: 9 })];
    const tally = tallyByAccount([trade('1', 'c', '2026-11-02T10:00:00Z')]);
    expect(sortAccounts(list, 'balance', 'desc', tally).map((a) => a.id)).toEqual(['c', 'a', 'b']);
    expect(sortAccounts(list, 'name', 'asc', tally).map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(sortAccounts(list, 'trades', 'desc', tally)[0].id).toBe('c');
  });

  it('summarises the folded group by status', () => {
    expect(statusSummary([acc('a', { status: 'passed' }), acc('b', { status: 'breached' }), acc('c', { status: 'passed' })], { passed: 'Passed', breached: 'Breached' })).toBe('Passed 2 · Breached 1');
  });
});
