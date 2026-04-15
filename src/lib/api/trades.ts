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
  // 90s timeout for Gemini processing of large files/images
  extractTrades: async (payload: { images: string[] } | { textContent: string }): Promise<{ items: any[]; error?: { code: string; message: string } }> => {
    return apiClient.post('/trades/extract', payload, { timeout: 90_000 });
  },
};
