import { AssetClass, TradeImage } from '@/types/trade';

export interface CreateTradePayload {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryDate: string;
  exitDate?: string;
  outcome?: 'TP' | 'SL' | 'PARTIAL' | 'BREAKEVEN';
  pnl?: number;
  riskRewardRatio?: number;
  strategy?: string;
  session?: string;
  marketCondition?: string;
  newsEvents?: string[];
  mistakes?: string[];
  keyLesson?: string;
  tags?: string[];
  accountId?: string;
  accountIds?: string[];
  brokenRuleIds?: string[];
  /** Sent only when given; an update without it keeps the stored value. */
  reviewed?: boolean;
  images?: TradeImage[];
  notes?: string;
  assetClass?: AssetClass;
  contractMultiplier?: number | null;
  fees?: number | null;
  grossPnl?: number;
  underlying?: string | null;
  optionType?: 'call' | 'put' | null;
  strike?: number | null;
  expiry?: string | null;
  externalId?: string;
  importSource?: string;
}
