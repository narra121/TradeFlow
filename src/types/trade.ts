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
  /** Only the account list carries these: live trades, and the newest trade day (`YYYY-MM-DD`, null when there is none). */
  tradeCount?: number;
  lastTradeDate?: string | null;
}

export interface TradeImage {
  id: string; // This is the S3 key/filename for the image
  url?: string; // Deprecated: kept for backward compatibility
  timeframe: string;
  description: string;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  entryDate: string; // ISO string for Redux serialization
  exitDate: string; // ISO string for Redux serialization
  outcome: TradeOutcome;
  pnl: number;
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
  accountId?: string; // Single account ID for this trade (from response)
  accountIds?: string[]; // Multiple account IDs for creating trades (request only)
  brokenRuleIds?: string[];
  assetClass?: AssetClass;
  contractMultiplier?: number;
  fees?: number;
  grossPnl?: number;
  underlying?: string;
  optionType?: 'call' | 'put';
  strike?: number;
  expiry?: string;
  /** broker trade id; dedupe key together with accountId */
  externalId?: string;
  importSource?: string;
  /** "Reviewed · followed plan"; absent = false. */
  reviewed?: boolean;
}

export type DebriefCheckId = 'stopSet' | 'riskWithinUsual' | 'lossKeptOrTarget' | 'notAfterLoss' | 'withinTradeCap' | 'setupHistory';

export interface DebriefCheck {
  id: DebriefCheckId;
  label: string;
  state: 'met' | 'notMet' | 'notApplicable';
  /** One sentence with the trade's own figures, written by the server's code. */
  detail: string;
}

/** `GET /v1/insights/debrief/:tradeId` (JournalAWSSetup src/features/insights/debrief.ts). */
export interface TradeDebrief {
  tradeId: string;
  checks: DebriefCheck[];
  metCount: number;
  /** Checks that applied (met + not met). */
  total: number;
  currency: string | null;
  timeZone: string;
  /** At most two model sentences tying the trade's note to the checks; absent when there are none. */
  sentences?: string[];
}

export type AssetClass = 'stock' | 'forex' | 'futures' | 'options' | 'crypto' | 'cfd' | 'commodity';

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
