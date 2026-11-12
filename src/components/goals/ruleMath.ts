import { tradeDayKey } from '@/lib/calendar';
import type { TradingRule } from '@/lib/api';
import type { Trade, TradingAccount } from '@/types/trade';
import { previousPeriods, type PeriodRef } from '@/components/goals/goalMath';

export const normaliseRule = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** Trades store the id of the rule they were logged against; rules are stored per period, so identity is the text. */
export function ruleTextById(allRules: TradingRule[]): Map<string, string> {
  return new Map(allRules.map((r) => [r.ruleId, normaliseRule(r.rule)]));
}

export interface RuleStat {
  breaks: number;
  /** Net P&L of the trades that broke the rule, per currency. */
  cost: { currency: string; net: number }[];
  tradeIds: string[];
}

export function tradesInPeriod(trades: Trade[], ref: PeriodRef): Trade[] {
  return trades.filter((t) => {
    const k = tradeDayKey(t);
    return k >= ref.startDate && k <= ref.endDate;
  });
}

export function breaksByRule(trades: Trade[], idText: Map<string, string>, accounts: Map<string, TradingAccount>): Map<string, RuleStat> {
  const out = new Map<string, RuleStat>();
  for (const t of trades) {
    const seen = new Set<string>();
    for (const id of t.brokenRuleIds ?? []) {
      const text = idText.get(id);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const stat = out.get(text) ?? { breaks: 0, cost: [], tradeIds: [] };
      stat.breaks += 1;
      stat.tradeIds.push(t.id);
      const currency = (t.accountId ? accounts.get(t.accountId)?.currency : undefined) || 'USD';
      const row = stat.cost.find((c) => c.currency === currency);
      if (row) row.net += t.pnl;
      else stat.cost.push({ currency, net: t.pnl });
      out.set(text, stat);
    }
  }
  return out;
}

/** `7 of 10 trades followed every rule you track`: own rules only. */
export function compliance(trades: Trade[], ownRuleTexts: Set<string>, idText: Map<string, string>): { followed: number; total: number; pct: number } | null {
  if (ownRuleTexts.size === 0 || trades.length === 0) return null;
  let followed = 0;
  for (const t of trades) {
    const broke = (t.brokenRuleIds ?? []).some((id) => {
      const text = idText.get(id);
      return !!text && ownRuleTexts.has(text);
    });
    if (!broke) followed += 1;
  }
  return { followed, total: trades.length, pct: Math.round((followed / trades.length) * 100) };
}

export type RuleCell = { kind: 'none' } | { kind: 'clean' } | { kind: 'broken'; count: number };

/** One rule over the 8 periods before `ref`: no cell when the period had no such rule or no trades. */
export function ruleHistory(text: string, ref: PeriodRef, allRules: TradingRule[], trades: Trade[], idText: Map<string, string>): { period: PeriodRef; cell: RuleCell }[] {
  return previousPeriods(ref).map((period) => {
    const existed = allRules.some((r) => r.ruleId.startsWith(`${period.key}#`) && normaliseRule(r.rule) === text);
    const inPeriod = tradesInPeriod(trades, period);
    if (!existed || inPeriod.length === 0) return { period, cell: { kind: 'none' } as RuleCell };
    const count = inPeriod.filter((t) => (t.brokenRuleIds ?? []).some((id) => idText.get(id) === text)).length;
    return { period, cell: count ? ({ kind: 'broken', count } as RuleCell) : ({ kind: 'clean' } as RuleCell) };
  });
}

export function ruleStreak(cells: RuleCell[]): number {
  let n = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].kind === 'clean') n += 1;
    else if (cells[i].kind === 'broken') break;
  }
  return n;
}
