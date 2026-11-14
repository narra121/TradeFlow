/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
export interface AggregatedStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  grossProfit: number;
  grossLoss: number;
  totalPnl: number;
  totalVolume: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  /** Average planned R:R (a plan, not a result); 0 when no trade recorded one. */
  avgRiskReward: number;
  /** Realised R from prices over the `rCount` trades with a stop and an exit price; null when there are none, absent from older servers. */
  avgR?: number | null;
  /** Sample standard deviation of realised R; null below 2 trades with an R. */
  sdR?: number | null;
  rCount?: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingTime: number;
  minDuration: number;
  maxDuration: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxDrawdown: number;
  sharpeRatio: number;
  durationBuckets: Array<{ range: string; wins: number; losses: number; total: number }>;
  symbolDistribution: Record<string, { count: number; wins: number; pnl: number }>;
  strategyDistribution: Record<string, { count: number; wins: number; pnl: number }>;
  sessionDistribution: Record<string, { count: number; wins: number; pnl: number }>;
  outcomeDistribution: Record<string, number>;
  hourlyStats: Array<{ hour: string; trades: number; wins: number; pnl: number; winRate: number }>;
  dailyWinRate: Array<{ day: string; trades: number; wins: number; pnl: number; winRate: number }>;
  dailyPnl: Array<{ date: string; pnl: number; cumulativePnl: number }>;
  equityCurve?: Array<{ date: string; pnl: number; cumulativePnl: number; symbol: string }>;
  mistakesDistribution?: Record<string, TagStats>;
  /** Keyed by rule id. */
  brokenRulesDistribution?: Record<string, TagStats>;
  /** Trades with no mistake tag: the baseline the Behaviour tab compares each mistake with. */
  noMistakeTrades?: TagStats;
  /** Trades that broke no rule. */
  noBrokenRuleTrades?: TagStats;
  [key: string]: any;
}

/** One tag's trades in `/stats`; `rCount` and `avgR` are absent from older servers, `avgR` null when no trade has an R. */
export interface TagStats {
  count: number;
  totalPnl: number;
  rCount?: number;
  avgR?: number | null;
}
