import type { Trade } from '@/types/trade';
import type { TrimmedTrade } from '@/types/insights';

const MAX_TRADES = 2000;

export function trimTrades(trades: Trade[]): TrimmedTrade[] {
  const subset = trades.slice(0, MAX_TRADES);
  return subset.map((t) => ({
    tradeId: t.id,
    symbol: t.symbol,
    side: t.direction,
    openDate: t.entryDate,
    closeDate: t.exitDate,
    pnl: t.pnl,
    volume: t.size,
    accountId: t.accountId,
    tags: t.tags,
    brokenRules: t.brokenRuleIds,
    mistakes: t.mistakes,
    lessons: t.keyLesson ? [t.keyLesson] : undefined,
  }));
}
