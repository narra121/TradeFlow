export interface HourlyStats {
  hour: number;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface DailyWinRate {
  date: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
}

export interface SymbolDistribution {
  symbol: string;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface StrategyDistribution {
  strategy: string;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}
