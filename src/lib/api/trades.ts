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
    return apiClient.get('/trades', { params });
  },

  // POST /v1/trades
  createTrade: async (payload: CreateTradePayload): Promise<{ trade: Trade }> => {
    return apiClient.post('/trades', payload);
  },

  // PUT /v1/trades/:id
  updateTrade: async (id: string, payload: Partial<CreateTradePayload>): Promise<{ trade: Trade }> => {
    return apiClient.put(`/trades/${id}`, payload);
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
