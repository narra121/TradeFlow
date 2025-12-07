import apiClient from './api';
import { Trade } from '@/types/trade';

export interface CreateTradePayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  openDate: string; // YYYY-MM-DD
  closeDate?: string;
  accountIds?: string[];
  brokenRuleIds?: string[];
  setupType?: string;
  tradingSession?: string;
  marketCondition?: string;
  preTradeNotes?: string;
  postTradeNotes?: string;
  mistakes?: string[];
  lessons?: string[];
  newsEvents?: string[];
  tags?: string[];
  images?: Array<{
    url?: string;
    base64Data?: string;
    timeframe?: string;
    description?: string;
  }>;
}

export interface TradesQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'OPEN' | 'CLOSED';
  symbol?: string;
}

export interface TradesResponse {
  trades: Trade[];
}

export interface BulkImportPayload {
  items: CreateTradePayload[];
  accountId?: string;
}

export interface UploadUrlResponse {
  url: string;
  key: string;
}

export const tradesApi = {
  // GET /v1/trades
  getTrades: async (params?: TradesQueryParams): Promise<TradesResponse> => {
    const response: any = await apiClient.get('/trades', { params });
    // Map backend response to frontend Trade type
    const trades = response.trades.map((trade: any) => ({
      ...trade,
      id: trade.tradeId,
      direction: trade.side === 'BUY' ? 'LONG' : 'SHORT',
      size: trade.quantity,
      entryDate: trade.openDate, // Keep as ISO string for Redux
      exitDate: trade.closeDate || undefined, // Keep as ISO string for Redux
    }));
    return { trades };
  },

  // POST /v1/trades
  createTrade: async (payload: CreateTradePayload): Promise<{ trade: Trade }> => {
    const response: any = await apiClient.post('/trades', payload);
    const backendTrade = response.trade;
    // Map backend response to frontend Trade type
    const trade: Trade = {
      ...backendTrade,
      id: backendTrade.tradeId,
      direction: backendTrade.side === 'BUY' ? 'LONG' : 'SHORT',
      size: backendTrade.quantity,
      entryDate: backendTrade.openDate, // Keep as ISO string for Redux
      exitDate: backendTrade.closeDate || undefined, // Keep as ISO string for Redux
    };
    return { trade };
  },

  // PUT /v1/trades/:id
  updateTrade: async (id: string, payload: Partial<CreateTradePayload>): Promise<{ trade: Trade }> => {
    const response: any = await apiClient.put(`/trades/${id}`, payload);
    const backendTrade = response.trade;
    // Map backend response to frontend Trade type
    const trade: Trade = {
      ...backendTrade,
      id: backendTrade.tradeId,
      direction: backendTrade.side === 'BUY' ? 'LONG' : 'SHORT',
      size: backendTrade.quantity,
      entryDate: backendTrade.openDate, // Keep as ISO string for Redux
      exitDate: backendTrade.closeDate || undefined, // Keep as ISO string for Redux
    };
    return { trade };
  },

  // DELETE /v1/trades/:id
  deleteTrade: async (id: string): Promise<void> => {
    return apiClient.delete(`/trades/${id}`);
  },

  // POST /v1/trades (bulk import)
  bulkImportTrades: async (payload: BulkImportPayload): Promise<{ imported: number; failed: number; errors: any[] }> => {
    return apiClient.post('/trades', payload);
  },

  // GET /v1/upload-url
  getUploadUrl: async (): Promise<UploadUrlResponse> => {
    return apiClient.get('/upload-url');
  },
};
