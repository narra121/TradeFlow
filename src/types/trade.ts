export type TradeDirection = 'LONG' | 'SHORT';
export type TradeOutcome = 'TP' | 'PARTIAL' | 'SL' | 'BREAKEVEN';

export type AccountStatus = 'active' | 'breached' | 'passed' | 'withdrawn' | 'inactive';
export type AccountType = 'prop_challenge' | 'prop_funded' | 'personal' | 'demo';

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  initialBalance: number;
  currency: string;
  createdAt: string; // ISO string for Redux serialization
  notes?: string;
}

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
  entryDate: string; // ISO string for Redux serialization
  exitDate?: string; // ISO string for Redux serialization
  outcome: TradeOutcome;
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
  emotions?: string;
  accountIds?: string[]; // Trade can belong to multiple accounts
  brokenRuleIds?: string[];
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
