import apiClient from './api';
import { TradeImage } from '@/types/trade';

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
}

export interface TradesQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export interface BulkImportPayload {
  items: CreateTradePayload[];
  accountId?: string;
}

export const tradesApi = {
  // POST /v1/trades/extract (supports up to 3 images)
  extractTrades: async (images: string[]): Promise<{ items: any[] }> => {
    return apiClient.post('/trades/extract', { images });
  },
};
