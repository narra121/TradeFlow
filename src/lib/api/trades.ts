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
  accountId?: string;
  accountIds?: string[]; // For creating trades in multiple accounts
  brokenRuleIds?: string[];
  images?: TradeImage[];
  notes?: string; // Trade notes
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
      notes: trade.tradeNotes || trade.notes,
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
      accountId: trade.accountId && trade.accountId !== '-1' && trade.accountId !== -1 ? trade.accountId : undefined,
      brokenRuleIds: trade.brokenRuleIds || [],
    }));
    
    return { trades };
  },

  // POST /v1/trades
  createTrade: async (payload: CreateTradePayload): Promise<{ trade: Trade }> => {
    // Map UI fields to backend API fields
    const backendPayload = {
      symbol: payload.symbol,
      side: payload.direction === 'LONG' ? 'BUY' : 'SELL', // Map direction to side
      quantity: payload.size, // Map size to quantity
      entryPrice: payload.entryPrice,
      exitPrice: payload.exitPrice,
      stopLoss: payload.stopLoss,
      takeProfit: payload.takeProfit,
      openDate: payload.entryDate, // Map entryDate to openDate
      closeDate: payload.exitDate, // Map exitDate to closeDate
      outcome: payload.outcome,
      pnl: payload.pnl,
      riskRewardRatio: payload.riskRewardRatio,
      setupType: payload.strategy,
      tradingSession: payload.session,
      marketCondition: payload.marketCondition,
      newsEvents: payload.newsEvents || [],
      mistakes: payload.mistakes || [],
      lessons: payload.keyLesson ? [payload.keyLesson] : [], // Convert single lesson to array
      tags: payload.tags || [],
      accountIds: payload.accountId ? [payload.accountId] : [], // Backend creates separate trades per account
      brokenRuleIds: payload.brokenRuleIds || [],
      images: payload.images || [],
    };

    const response: any = await apiClient.post('/trades', backendPayload);
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
    // Map UI fields to backend API fields
    const backendPayload: any = {};
    if (payload.symbol !== undefined) backendPayload.symbol = payload.symbol;
    if (payload.direction !== undefined) backendPayload.side = payload.direction === 'LONG' ? 'BUY' : 'SELL';
    if (payload.size !== undefined) backendPayload.quantity = payload.size;
    if (payload.entryPrice !== undefined) backendPayload.entryPrice = payload.entryPrice;
    if (payload.exitPrice !== undefined) backendPayload.exitPrice = payload.exitPrice;
    if (payload.stopLoss !== undefined) backendPayload.stopLoss = payload.stopLoss;
    if (payload.takeProfit !== undefined) backendPayload.takeProfit = payload.takeProfit;
    if (payload.entryDate !== undefined) backendPayload.openDate = payload.entryDate;
    if (payload.exitDate !== undefined) backendPayload.closeDate = payload.exitDate;
    if (payload.outcome !== undefined) backendPayload.outcome = payload.outcome;
    if (payload.pnl !== undefined) backendPayload.pnl = payload.pnl;
    if (payload.riskRewardRatio !== undefined) backendPayload.riskRewardRatio = payload.riskRewardRatio;
    if (payload.strategy !== undefined) backendPayload.setupType = payload.strategy;
    if (payload.session !== undefined) backendPayload.tradingSession = payload.session;
    if (payload.marketCondition !== undefined) backendPayload.marketCondition = payload.marketCondition;
    if (payload.newsEvents !== undefined) backendPayload.newsEvents = payload.newsEvents;
    if (payload.mistakes !== undefined) backendPayload.mistakes = payload.mistakes;
    if (payload.keyLesson !== undefined) backendPayload.lessons = payload.keyLesson ? [payload.keyLesson] : [];
    if (payload.tags !== undefined) backendPayload.tags = payload.tags;
    if (payload.accountId !== undefined) backendPayload.accountId = payload.accountId;
    if (payload.brokenRuleIds !== undefined) backendPayload.brokenRuleIds = payload.brokenRuleIds;
    if (payload.images !== undefined) backendPayload.images = payload.images;

    const response: any = await apiClient.put(`/trades/${id}`, backendPayload);
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
    // Map UI fields to backend API fields for each item
    const mappedItems = payload.items.map(item => ({
      symbol: item.symbol,
      side: item.direction === 'LONG' ? 'BUY' : 'SELL', // Map direction to side
      quantity: item.size, // Map size to quantity
      entryPrice: item.entryPrice,
      exitPrice: item.exitPrice,
      stopLoss: item.stopLoss,
      takeProfit: item.takeProfit,
      openDate: item.entryDate, // Map entryDate to openDate
      closeDate: item.exitDate, // Map exitDate to closeDate
      outcome: item.outcome,
      pnl: item.pnl,
      riskRewardRatio: item.riskRewardRatio,
      setupType: item.strategy,
      tradingSession: item.session,
      marketCondition: item.marketCondition,
      newsEvents: item.newsEvents || [],
      mistakes: item.mistakes || [],
      lessons: item.keyLesson ? [item.keyLesson] : [], // Convert single lesson to array
      tags: item.tags || [],
      accountId: item.accountId, // Single accountId per trade
      brokenRuleIds: item.brokenRuleIds || [],
      images: item.images || [],
    }));

    const response: any = await apiClient.post('/trades', { 
      items: mappedItems,
      accountId: payload.accountId 
    });
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
