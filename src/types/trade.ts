export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  entryDate: Date;
  exitDate?: Date;
  status: TradeStatus;
  pnl?: number;
  pnlPercent?: number;
  riskRewardRatio: number;
  notes?: string;
  setup?: string;
  strategy?: string;
  emotions?: string;
  screenshot?: string;
  tags?: string[];
}

export interface DailyStats {
  date: Date;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
}

export interface PortfolioStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRiskReward: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}
