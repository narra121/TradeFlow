import axios from 'axios';
import apiClient from './api';
import { TradeImage } from '@/types/trade';

const EXTRACT_TRADES_URL = import.meta.env.VITE_EXTRACT_TRADES_URL;

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
  // Calls Lambda Function URL directly (bypasses API Gateway 30s timeout).
  // Auth: getUserId() decodes JWT from Authorization header — same as API Gateway path.
  extractTrades: async (payload: { images: string[] } | { textContent: string }): Promise<{ items: any[]; error?: { code: string; message: string } }> => {
    if (EXTRACT_TRADES_URL) {
      const token = localStorage.getItem('idToken');
      const res = await axios.post(EXTRACT_TRADES_URL, payload, {
        timeout: 90_000,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = res.data;
      if (body?.data !== undefined) return body.data;
      return body;
    }
    // Fallback: API Gateway route (30s limit)
    return apiClient.post('/trades/extract', payload, { timeout: 90_000 });
  },
};
