import { Trade } from '@/types/trade';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, endOfDay, isWithinInterval } from 'date-fns';
import { getEligibleTrades } from './tradeCalculations';

export interface GoalProgress {
  current: number;
  target: number;
  progress: number; // Percentage
  achieved: boolean;
}

export interface AccountGoalProgress {
  accountId: string;
  profit: GoalProgress;
  winRate: GoalProgress;
  maxDrawdown: GoalProgress;
  tradeCount: GoalProgress;
}

/**
 * Calculate goal progress for a specific account and period
 */
export function calculateGoalProgressForAccount(
  trades: Trade[] | undefined,
  accountId: string,
  period: 'weekly' | 'monthly',
  targets: {
    profit: number;
    winRate: number;
    maxDrawdown: number;
    maxTrades: number;
  },
  customDateRange?: { start: Date; end: Date }
): AccountGoalProgress {
  const safeTrades = trades ?? [];
  const eligibleTrades = getEligibleTrades(safeTrades);

  // Use custom date range if provided, otherwise calculate from current date
  const now = new Date();
  const periodStart = customDateRange?.start || (period === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now));
  const periodEnd = customDateRange?.end || (period === 'weekly' ? endOfDay(endOfWeek(now, { weekStartsOn: 1 })) : endOfDay(endOfMonth(now)));

  const filteredTrades = eligibleTrades.filter(trade => {
    const tradeDate = new Date(trade.exitDate || trade.entryDate);
    const matchesAccount = accountId === 'ALL' || trade.accountId === accountId;
    const matchesPeriod = isWithinInterval(tradeDate, { start: periodStart, end: periodEnd });
    return matchesAccount && matchesPeriod;
  });

  // Calculate profit
  const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const profitProgress = targets.profit > 0 ? (totalProfit / targets.profit) * 100 : 0;

  // Calculate win rate
  const wins = filteredTrades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;
  const winRateProgress = targets.winRate > 0 ? (winRate / targets.winRate) * 100 : 0;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningPnl = 0;
  filteredTrades.forEach(trade => {
    runningPnl += (trade.pnl || 0);
    if (runningPnl > peak) peak = runningPnl;
    const drawdown = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });
  // For max drawdown, lower is better (inverse goal)
  const drawdownProgress = targets.maxDrawdown > 0 ? (maxDrawdown / targets.maxDrawdown) * 100 : 0;

  // Calculate trade count
  const tradeCount = filteredTrades.length;
  // For trade count, it's a limit (inverse goal)
  const tradeCountProgress = targets.maxTrades > 0 ? (tradeCount / targets.maxTrades) * 100 : 0;

  return {
    accountId,
    profit: {
      current: totalProfit,
      target: targets.profit,
      progress: Math.min(profitProgress, 100),
      achieved: totalProfit >= targets.profit
    },
    winRate: {
      current: winRate,
      target: targets.winRate,
      progress: Math.min(winRateProgress, 100),
      achieved: winRate >= targets.winRate
    },
    maxDrawdown: {
      current: maxDrawdown,
      target: targets.maxDrawdown,
      progress: Math.min(drawdownProgress, 100),
      achieved: maxDrawdown <= targets.maxDrawdown // Inverse: lower is better
    },
    tradeCount: {
      current: tradeCount,
      target: targets.maxTrades,
      progress: Math.min(tradeCountProgress, 100),
      achieved: tradeCount <= targets.maxTrades // Inverse: staying under limit is good
    }
  };
}

/**
 * Calculate broken rules count from trades
 */
export function calculateBrokenRulesCounts(
  trades: Trade[] | undefined,
  period: 'weekly' | 'monthly' = 'weekly',
  customDateRange?: { start: Date; end: Date }
): Record<string, number> {
  const now = new Date();
  const periodStart = customDateRange?.start || (period === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now));
  const periodEnd = customDateRange?.end || (period === 'weekly' ? endOfDay(endOfWeek(now, { weekStartsOn: 1 })) : endOfDay(endOfMonth(now)));

  const counts: Record<string, number> = {};
  const eligibleTrades = getEligibleTrades(trades ?? []);

  eligibleTrades.forEach(trade => {
    const tradeDate = new Date(trade.entryDate);
    if (isWithinInterval(tradeDate, { start: periodStart, end: periodEnd })) {
      trade.brokenRuleIds?.forEach(ruleId => {
        counts[ruleId] = (counts[ruleId] || 0) + 1;
      });
    }
  });

  return counts;
}

/**
 * Get date range for current period
 */
export function getCurrentPeriodRange(period: 'weekly' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'weekly') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfDay(endOfWeek(now, { weekStartsOn: 1 }))
    };
  } else {
    return {
      start: startOfMonth(now),
      end: endOfDay(endOfMonth(now))
    };
  }
}

/**
 * Check if trades data contains current period
 */
export function hasCurrentPeriodData(
  trades: Trade[],
  period: 'weekly' | 'monthly'
): boolean {
  if (trades.length === 0) return false;

  const { start, end } = getCurrentPeriodRange(period);

  return trades.some(trade => {
    const tradeDate = new Date(trade.exitDate || trade.entryDate);
    return isWithinInterval(tradeDate, { start, end });
  });
}
