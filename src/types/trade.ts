export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface TradeImage {
  id: string;
  url: string;
  timeframe: string;
  description: string;
}

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
  session?: string;
  marketCondition?: string;
  newsEvents?: string[];
  mistakes?: string[];
  keyLesson?: string;
  images?: TradeImage[];
  tags?: string[];
  emotions?: string; // Legacy field for mock data compatibility
}

// Saved options for smart inputs (would be stored in DB)
export interface SavedOptions {
  symbols: string[];
  strategies: string[];
  sessions: string[];
  marketConditions: string[];
  newsEvents: string[];
  mistakes: string[];
  lessons: string[];
  timeframes: string[];
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
