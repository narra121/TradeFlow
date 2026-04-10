import { Trade } from '@/types/trade';

/**
 * Filter out unmapped trades (no accountId or accountId = '-1')
 */
export function getEligibleTrades(trades: Trade[]): Trade[] {
  return trades.filter((trade) => {
    const id = trade.accountId;
    // No accountId means it's unmapped -> exclude
    if (!id) return false;
    const normalized = String(id).trim();
    // accountId '-1' means unmapped -> exclude
    return normalized !== '-1';
  });
}

export interface TradeStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  avgRiskReward: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  grossProfit: number;
  grossLoss: number;
  expectancy: number;
  sharpeRatio: number;
  avgHoldingTime: number;
  totalVolume: number;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/**
 * Format currency with proper decimals
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage with proper decimals
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
