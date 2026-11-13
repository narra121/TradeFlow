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
  images?: TradeImage[];
  notes?: string;
  assetClass?: AssetClass;
  contractMultiplier?: number;
  fees?: number;
  grossPnl?: number;
  underlying?: string;
  optionType?: 'call' | 'put';
  strike?: number;
  expiry?: string;
  externalId?: string;
  importSource?: string;
}
