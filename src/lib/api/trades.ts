import apiClient from './api';
import { Trade, TradeImage } from '@/types/trade';

// Frontend payload - matches exactly what AddTradeModal sends (line 104-125)
// This gets mapped to backend format in AppPage.tsx before API call
export interface CreateTradePayload {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryDate: string; // ISO string
  exitDate?: string; // ISO string
  outcome?: 'TP' | 'SL' | 'PARTIAL' | 'BREAKEVEN';
  pnl?: number; // Calculated in UI
  riskRewardRatio?: number; // Calculated in UI
  strategy?: string;
  session?: string;
  marketCondition?: string;
  newsEvents?: string[];
  mistakes?: string[];
  keyLesson?: string; // Single string from UI
  tags?: string[];
  accountIds?: string[];
  brokenRuleIds?: string[];
  images?: TradeImage[];
}

export interface TradesQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;

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
    
    // Handle case where response might be { trades: [...] } or just [...]
    const tradesArray = Array.isArray(response) ? response : (response?.trades || []);
    
    // Map backend response to frontend Trade type - DO NOT spread original trade
    const trades = tradesArray.map((trade: any) => ({
      id: trade.tradeId,
      symbol: trade.symbol,
      direction: trade.side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: trade.entryPrice || 0,
      exitPrice: trade.exitPrice || undefined,
      stopLoss: trade.stopLoss || 0,
      takeProfit: trade.takeProfit || 0,
      size: trade.quantity,
      entryDate: trade.openDate,
      exitDate: trade.closeDate || undefined,
      outcome: trade.outcome || 'TP',
      pnl: trade.pnl || 0,
      pnlPercent: trade.pnlPercent,
      riskRewardRatio: trade.riskRewardRatio || 0,
      notes: trade.postTradeNotes || trade.preTradeNotes,
      setup: trade.setupType,
      strategy: trade.setupType,
      session: trade.tradingSession,
      marketCondition: trade.marketCondition,
      newsEvents: trade.newsEvents || [],
      mistakes: trade.mistakes || [],
      keyLesson: trade.lessons?.[0],
      images: trade.images || [],
      tags: trade.tags || [],
      emotions: trade.emotions,
      accountIds: trade.accountId ? [trade.accountId] : [],
      brokenRuleIds: trade.brokenRuleIds || [],
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
      outcome: backendTrade.outcome || 'TP',
      riskRewardRatio: backendTrade.riskRewardRatio || 0,
      stopLoss: backendTrade.stopLoss || 0,
      takeProfit: backendTrade.takeProfit || 0,
      pnl: backendTrade.pnl || 0,
      entryPrice: backendTrade.entryPrice || 0,
      exitPrice: backendTrade.exitPrice || undefined,
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
      outcome: backendTrade.outcome || 'TP',
      riskRewardRatio: backendTrade.riskRewardRatio || 0,
      stopLoss: backendTrade.stopLoss || 0,
      takeProfit: backendTrade.takeProfit || 0,
      pnl: backendTrade.pnl || 0,
      entryPrice: backendTrade.entryPrice || 0,
      exitPrice: backendTrade.exitPrice || undefined,
    };
    return { trade };
  },

  // DELETE /v1/trades/:id
  deleteTrade: async (id: string): Promise<void> => {
    return apiClient.delete(`/trades/${id}`);
  },

  // POST /v1/trades (bulk import)
  bulkImportTrades: async (payload: BulkImportPayload): Promise<{ imported: number; failed: number; errors: any[] }> => {
    const response: any = await apiClient.post('/trades', payload);
    // Backend returns: { created: number, skipped: [], errors: [], items: [] }
    // Map to frontend expected format
    return {
      imported: response.created || 0,
      failed: response.errors?.length || 0,
      errors: response.errors || []
    };
  },

  // GET /v1/upload-url
  getUploadUrl: async (): Promise<UploadUrlResponse> => {
    return apiClient.get('/upload-url');
  },

  // POST /v1/trades/extract (supports up to 3 images)
  extractTrades: async (images: string[]): Promise<{ items: any[] }> => {
    return apiClient.post('/trades/extract', { images });
  },
};
