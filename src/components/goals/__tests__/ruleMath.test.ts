import { describe, expect, it } from 'vitest';
import { breaksByRule, compliance, normaliseRule, ruleHistory, ruleStreak, ruleTextById, tradesInPeriod } from '../ruleMath';
import { periodOf } from '../goalMath';
import type { TradingRule } from '@/lib/api';
import type { Trade, TradingAccount } from '@/types/trade';

const rule = (ruleId: string, text: string): TradingRule => ({ ruleId, rule: text, userId: 'u', completed: false, isActive: true, createdAt: '', updatedAt: '' });
const trade = (id: string, exit: string, pnl: number, broken: string[] = [], accountId = 'usd'): Trade =>
  ({ id, symbol: 'X', direction: 'LONG', entryDate: exit, exitDate: exit, pnl, accountId, brokenRuleIds: broken }) as Trade;
const accounts = new Map<string, TradingAccount>([
  ['usd', { id: 'usd', currency: 'USD' } as TradingAccount],
  ['inr', { id: 'inr', currency: 'INR' } as TradingAccount],
]);

const allRules = [
  rule('week#2026-11-09#a', 'No trade after two losses'),
  rule('week#2026-11-02#b', 'No  trade after two LOSSES'),
  rule('week#2026-11-09#c', 'Risk at most 1%'),
];
const idText = ruleTextById(allRules);

describe('rule identity', () => {
  it('matches a rule stored in two periods by its text', () => {
    expect(normaliseRule('  No  trade   after TWO losses ')).toBe('no trade after two losses');
    expect(idText.get('week#2026-11-09#a')).toBe(idText.get('week#2026-11-02#b'));
  });
});

describe('breaks and cost', () => {
  const week = periodOf('weekly', new Date(2026, 10, 11));
  const trades = [
    trade('1', '2026-11-09T10:00:00', -48, ['week#2026-11-02#b']),
    trade('2', '2026-11-10T10:00:00', 60),
    trade('3', '2026-11-11T10:00:00', -3000, ['week#2026-11-09#a'], 'inr'),
    trade('4', '2026-11-02T10:00:00', -10, ['week#2026-11-09#a']),
  ];

  it('keeps only the trades of the period', () => {
    expect(tradesInPeriod(trades, week).map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('counts breaks per rule text and sums the cost per currency', () => {
    const stats = breaksByRule(tradesInPeriod(trades, week), idText, accounts);
    const s = stats.get('no trade after two losses')!;
    expect(s.breaks).toBe(2);
    expect(s.cost).toEqual([{ currency: 'USD', net: -48 }, { currency: 'INR', net: -3000 }]);
    expect(s.tradeIds).toEqual(['1', '3']);
    expect(stats.get('risk at most 1%')).toBeUndefined();
  });

  it('reports compliance for own rules only', () => {
    const own = new Set(['no trade after two losses']);
    expect(compliance(tradesInPeriod(trades, week), own, idText)).toEqual({ followed: 1, total: 3, pct: 33 });
    expect(compliance(tradesInPeriod(trades, week), new Set(), idText)).toBeNull();
    expect(compliance([], own, idText)).toBeNull();
  });
});

describe('rule history', () => {
  const week = periodOf('weekly', new Date(2026, 10, 11));
  const trades = [trade('1', '2026-11-03T10:00:00', -5, ['week#2026-11-02#b']), trade('2', '2026-10-27T10:00:00', 5)];
  const rules = [...allRules, rule('week#2026-10-26#d', 'no trade after two losses')];

  it('has a cell per period: nothing when the rule or the trades are missing, a count when broken', () => {
    const h = ruleHistory('no trade after two losses', week, rules, trades, ruleTextById(rules));
    expect(h).toHaveLength(8);
    expect(h[7].cell).toEqual({ kind: 'broken', count: 1 });
    expect(h[6].cell).toEqual({ kind: 'clean' });
    expect(h[0].cell).toEqual({ kind: 'none' });
  });

  it('counts clean periods at the end as the streak, stopping at a break', () => {
    expect(ruleStreak([{ kind: 'broken', count: 1 }, { kind: 'clean' }, { kind: 'none' }, { kind: 'clean' }])).toBe(2);
    expect(ruleStreak([{ kind: 'clean' }, { kind: 'broken', count: 2 }])).toBe(0);
  });
});
