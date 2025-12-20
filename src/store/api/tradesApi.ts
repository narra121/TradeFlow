import { api } from './baseApi';
import type { 
  CreateTradePayload, 
  TradesQueryParams, 
  BulkImportPayload, 
  TradesResponse,
  UploadUrlResponse
} from '@/lib/api';
import type { Trade } from '@/types/trade';

const mapBackendTradeToTrade = (trade: any): Trade => {
  const id = trade.tradeId ?? trade.id;
  const side = trade.side ?? trade.direction;
  const direction: Trade['direction'] = side === 'BUY' || side === 'LONG' ? 'LONG' : 'SHORT';

  const entryDate = trade.openDate ?? trade.entryDate;
  const exitDate = trade.closeDate ?? trade.exitDate;

  const notes = trade.postTradeNotes ?? trade.preTradeNotes ?? trade.notes;

  const setupType = trade.setupType ?? trade.strategy ?? trade.setup;
  const tradingSession = trade.tradingSession ?? trade.session;

  const accountIds: string[] = Array.isArray(trade.accountIds)
    ? trade.accountIds
    : trade.accountId
      ? [trade.accountId]
      : [];

  return {
    id,
    symbol: trade.symbol,
    direction,
    entryPrice: trade.entryPrice ?? 0,
    exitPrice: trade.exitPrice ?? undefined,
    stopLoss: trade.stopLoss ?? 0,
    takeProfit: trade.takeProfit ?? 0,
    size: trade.quantity ?? trade.size,
    entryDate,
    exitDate: exitDate ?? undefined,
    outcome: trade.outcome ?? 'TP',
    pnl: trade.pnl ?? 0,
    pnlPercent: trade.pnlPercent,
    riskRewardRatio: trade.riskRewardRatio ?? 0,
    notes,
    setup: setupType,
    strategy: setupType,
    session: tradingSession,
    marketCondition: trade.marketCondition,
    newsEvents: trade.newsEvents ?? [],
    mistakes: trade.mistakes ?? [],
    keyLesson: Array.isArray(trade.lessons) ? trade.lessons?.[0] : trade.lessons,
    images: trade.images ?? [],
    tags: trade.tags ?? [],
    emotions: trade.emotions,
    accountIds,
    brokenRuleIds: trade.brokenRuleIds ?? [],
  };
};

export const tradesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTrades: builder.query<Trade[], TradesQueryParams | void>({
      query: (params) => ({
        url: '/trades',
        params: params || undefined,
      }),
      transformResponse: (response: any) => {
        // Handle case where response might be { trades: [...] } or just [...]
        const tradesArray = Array.isArray(response) ? response : (response?.trades || []);
        
        // Map backend response to frontend Trade type
        return tradesArray.map(mapBackendTradeToTrade);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Trades' as const, id })),
              { type: 'Trades', id: 'LIST' },
            ]
          : [{ type: 'Trades', id: 'LIST' }],
    }),

    // GET /trades/:id
    getTrade: builder.query<Trade, string>({
      query: (id) => ({
        url: `/trades/${id}`,
      }),
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        return mapBackendTradeToTrade(trade);
      },
      providesTags: (result, error, id) => [{ type: 'Trades', id }],
    }),
    
    createTrade: builder.mutation<Trade, CreateTradePayload>({
      query: (payload) => {
        // Map UI fields to backend API fields
        const backendPayload = {
          symbol: payload.symbol,
          side: payload.direction === 'LONG' ? 'BUY' : 'SELL',
          quantity: payload.size,
          entryPrice: payload.entryPrice || 0,
          exitPrice: payload.exitPrice,
          stopLoss: payload.stopLoss || 0,
          takeProfit: payload.takeProfit || 0,
          openDate: payload.entryDate,
          closeDate: payload.exitDate,
          outcome: payload.outcome,
          pnl: payload.pnl || 0,
          riskRewardRatio: payload.riskRewardRatio || 0,
          setupType: payload.strategy,
          tradingSession: payload.session,
          marketCondition: payload.marketCondition,
          newsEvents: payload.newsEvents,
          mistakes: payload.mistakes,
          lessons: payload.keyLesson ? [payload.keyLesson] : undefined,
          postTradeNotes: payload.notes,
          tags: payload.tags,
          accountId: payload.accountIds?.[0],
          accountIds: payload.accountIds,
          brokenRuleIds: payload.brokenRuleIds,
          images: payload.images,
        };
        
        return {
          url: '/trades',
          method: 'POST',
          body: backendPayload,
        };
      },
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        return mapBackendTradeToTrade(trade);
      },
      invalidatesTags: [{ type: 'Trades', id: 'LIST' }, 'Stats', 'Analytics'],
    }),
    
    updateTrade: builder.mutation<Trade, { id: string; payload: Partial<CreateTradePayload> }>({
      query: ({ id, payload }) => {
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
        if (payload.keyLesson !== undefined) backendPayload.lessons = [payload.keyLesson];
        if (payload.notes !== undefined) backendPayload.postTradeNotes = payload.notes;
        if (payload.tags !== undefined) backendPayload.tags = payload.tags;
        if (payload.accountIds !== undefined) {
          backendPayload.accountId = payload.accountIds[0];
          backendPayload.accountIds = payload.accountIds;
        }
        if (payload.brokenRuleIds !== undefined) backendPayload.brokenRuleIds = payload.brokenRuleIds;
        if (payload.images !== undefined) backendPayload.images = payload.images;
        
        return {
          url: `/trades/${id}`,
          method: 'PUT',
          body: backendPayload,
        };
      },
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        return mapBackendTradeToTrade(trade);
      },
      // Do NOT invalidate the list here (would refetch all trades).
      // Instead, fetch the single trade and patch list caches.
      invalidatesTags: ['Stats', 'Analytics'],
      async onQueryStarted({ id }, { dispatch, getState, queryFulfilled }) {
        try {
          // Wait for update to succeed and use the mutation response as the source of truth.
          const { data: updatedTrade } = await queryFulfilled;

          // Update the single-trade cache if it exists.
          dispatch(
            tradesApi.util.updateQueryData('getTrade', id, (draft) => {
              Object.assign(draft, updatedTrade);
            })
          );

          // Patch all cached getTrades query results in-place (no network refetch).
          const state: any = getState();
          const queries = state?.[api.reducerPath]?.queries || {};
          for (const entry of Object.values<any>(queries)) {
            if (entry?.endpointName !== 'getTrades') continue;

            dispatch(
              tradesApi.util.updateQueryData('getTrades', entry.originalArgs, (draft: Trade[]) => {
                const index = draft.findIndex((t) => t.id === id);
                if (index !== -1) {
                  draft[index] = updatedTrade;
                }
              })
            );
          }
        } catch {
          // No-op: if update/refetch fails, leave cache as-is.
        }
      },
    }),
    
    deleteTrade: builder.mutation<void, string>({
      query: (id) => ({
        url: `/trades/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Trades', id },
        { type: 'Trades', id: 'LIST' },
        'Stats',
        'Analytics',
      ],
    }),
    
    bulkImportTrades: builder.mutation<any, BulkImportPayload>({
      query: (payload) => ({
        url: '/trades/bulk-import',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Trades', id: 'LIST' }, 'Stats', 'Analytics'],
    }),
    
    getUploadUrl: builder.query<UploadUrlResponse, void>({
      query: () => '/trades/upload-url',
    }),
  }),
});

export const {
  useGetTradesQuery,
  useLazyGetTradesQuery,
  useGetTradeQuery,
  useLazyGetTradeQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
  useBulkImportTradesMutation,
  useGetUploadUrlQuery,
  useLazyGetUploadUrlQuery,
} = tradesApi;
