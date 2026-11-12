/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { api } from './baseApi';
import type {
  CreateTradePayload,
  TradesQueryParams,
  BulkImportPayload,
} from '@/lib/api';
import type { Trade } from '@/types/trade';
import { backgroundCacheStoreTrades, backgroundCacheDeleteTrades } from '@/lib/cache/proactive-cache';

// --- Paginated trades types ---

export interface PaginatedTradesQueryParams extends TradesQueryParams {
  limit?: number;
  cursor?: string;
}

export interface PaginationInfo {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedTradesResponse {
  trades: Trade[];
  pagination: PaginationInfo;
}

// DynamoDB Streams are async — after a trade mutation the stream handler
// recalculates account balances and DailyStats (which goals/rules progress
// depend on), but it hasn't finished by the time the mutation response
// arrives.  A short delay before refetching gives the stream handler time
// to write the updated data.
const STREAM_PROPAGATION_DELAY_MS = 4000;

let streamDebounceTimer: ReturnType<typeof setTimeout>;
const debouncedInvalidateStreamDeps = (dispatch: any) => {
  clearTimeout(streamDebounceTimer);
  streamDebounceTimer = setTimeout(() => {
    dispatch(api.util.invalidateTags(['Accounts', 'Goals', 'Rules', 'SavedOptions', 'Stats', { type: 'Trades', id: 'LIST' }]));
  }, STREAM_PROPAGATION_DELAY_MS);
};

const EXTRA_FIELDS = ['assetClass', 'contractMultiplier', 'fees', 'grossPnl', 'underlying', 'optionType', 'strike', 'expiry', 'externalId', 'importSource'] as const;

/** CONTRACT §6 fields: copied only when present so older trades render as before. */
const mapExtraFieldsFromBackend = (trade: any): Partial<Trade> => {
  const out: Record<string, unknown> = {};
  for (const key of EXTRA_FIELDS) if (trade[key] !== undefined && trade[key] !== null) out[key] = trade[key];
  return out as Partial<Trade>;
};

/** Same fields, front to back, used by create, update and bulk so the three mappers cannot drift. */
export const mapExtraFieldsToBackend = (payload: Partial<CreateTradePayload>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of EXTRA_FIELDS) {
    const v = (payload as Record<string, unknown>)[key];
    if (v !== undefined && v !== null) out[key] = v;
  }
  return out;
};

export const SCOPE_TRADE_CEILING = 5000;
const SCOPE_PAGE_SIZE = 100;
export const TRADE_LIST_ENDPOINTS = ['getTrades', 'getScopeTrades'];

/** Adds saved trades to every cached scope list they belong to; the list endpoint reads an eventually consistent index, so an immediate refetch can miss them. */
const insertIntoScopeCaches = (dispatch: any, getState: any, trades: Trade[]) => {
  const queries = getState()?.[api.reducerPath]?.queries || {};
  for (const entry of Object.values<any>(queries)) {
    if (entry?.endpointName !== 'getScopeTrades') continue;
    const { accountId, startDate, endDate } = entry.originalArgs ?? {};
    const fits = trades.filter((t) => {
      if (accountId && accountId !== 'ALL' && t.accountId !== accountId) return false;
      const day = (t.exitDate || t.entryDate || '').slice(0, 10);
      return (!startDate || day >= startDate) && (!endDate || day <= endDate);
    });
    if (!fits.length) continue;
    dispatch((tradesApi.util.updateQueryData as any)('getScopeTrades', entry.originalArgs, (draft: Trade[]) => {
      for (const t of fits) if (!draft.some((d) => d.id === t.id)) draft.push(t);
    }));
  }
};

const mapBackendTradeToTrade = (trade: any): Trade => {
  const id = trade.tradeId ?? trade.id;
  const side = trade.side ?? trade.direction;
  const direction: Trade['direction'] = side === 'BUY' || side === 'LONG' ? 'LONG' : 'SHORT';

  const entryDate = trade.openDate ?? trade.entryDate;
  const exitDate = trade.closeDate ?? trade.exitDate;

  const notes = trade.tradeNotes ?? trade.notes;

  const setupType = trade.setupType ?? trade.strategy ?? trade.setup;
  const tradingSession = trade.tradingSession ?? trade.session;

  // accountId - filter out '-1' (string or number) which means no account
  const accountId = trade.accountId && trade.accountId !== '-1' && trade.accountId !== -1 ? trade.accountId : undefined;

  return {
    id,
    symbol: trade.symbol,
    direction,
    entryPrice: trade.entryPrice ?? 0,
    exitPrice: trade.exitPrice ?? 0,
    stopLoss: trade.stopLoss ?? 0,
    takeProfit: trade.takeProfit ?? 0,
    size: trade.quantity ?? trade.size,
    entryDate,
    exitDate: exitDate ?? '',
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
    accountId,
    brokenRuleIds: trade.brokenRuleIds ?? [],
    ...mapExtraFieldsFromBackend(trade),
  };
};

/** `GET /trades` answers 400 without both dates, so an open end of the scope is an open-ended range. */
const OPEN_START = '2000-01-01';
const OPEN_END = '2099-12-31';

type ScopeResult = { data?: unknown; error?: any };
type ScopeFetch = (arg: { url: string; params: Record<string, unknown> }) => ScopeResult | PromiseLike<ScopeResult>;

export async function fetchAllScopeTrades(
  params: { accountId?: string; startDate?: string; endDate?: string; importBatchId?: string },
  fetchPage: ScopeFetch,
): Promise<{ data: Trade[] } | { error: any }> {
  const all: Trade[] = [];
  let cursor: string | undefined;
  for (let page = 0; page <= Math.ceil(SCOPE_TRADE_CEILING / SCOPE_PAGE_SIZE); page++) {
    const res = await fetchPage({ url: '/trades', params: { ...params, startDate: params.startDate || OPEN_START, endDate: params.endDate || OPEN_END, limit: SCOPE_PAGE_SIZE, ...(cursor ? { cursor } : {}) } });
    if (res.error) return { error: res.error };
    const body: any = res.data;
    const list: any[] = Array.isArray(body) ? body : body?.trades ?? [];
    all.push(...list.map(mapBackendTradeToTrade));
    cursor = body?.pagination?.hasMore ? body.pagination.nextCursor ?? undefined : undefined;
    if (!cursor || all.length >= SCOPE_TRADE_CEILING) break;
  }
  return { data: all.slice(0, SCOPE_TRADE_CEILING) };
}

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
        const mappedTrades = tradesArray.map(mapBackendTradeToTrade);

        // Preserve _apiMessage from baseApi
        if (response?._apiMessage) {
            Object.defineProperty(mappedTrades, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }

        return mappedTrades;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Trades' as const, id })),
              { type: 'Trades', id: 'LIST' },
            ]
          : [{ type: 'Trades', id: 'LIST' }],
      async onQueryStarted(_params, { queryFulfilled }) {
        try {
          const { data: trades } = await queryFulfilled;
          backgroundCacheStoreTrades(trades).catch(() => {});
        } catch {
          // the local cache is best effort
        }
      },
    }),

    /** Every trade in the scope (account + date range): pages `/trades` to completion, newest 5,000 at most. */
    getScopeTrades: builder.query<Trade[], { accountId?: string; startDate?: string; endDate?: string; importBatchId?: string }>({
      queryFn: (params, _api, _extra, fetchWithBQ) => fetchAllScopeTrades(params, fetchWithBQ),
      providesTags: (result) => [
        ...(result ?? []).map(({ id }) => ({ type: 'Trades' as const, id })),
        { type: 'Trades' as const, id: 'LIST' },
      ],
    }),

    getTradesPaginated: builder.query<PaginatedTradesResponse, PaginatedTradesQueryParams | void>({
      query: (params) => {
        const p = params || {};
        return {
          url: '/trades',
          params: {
            ...p,
            limit: ('limit' in p && p.limit) ? p.limit : 50,
            ...('cursor' in p && p.cursor ? { cursor: p.cursor } : {}),
          },
        };
      },
      transformResponse: (response: any, _meta: unknown, arg: PaginatedTradesQueryParams | void) => {
        // Handle both paginated { trades, pagination } and legacy array responses
        const tradesArray = Array.isArray(response) ? response : (response?.trades || []);
        const mappedTrades = tradesArray.map(mapBackendTradeToTrade);

        const requestedLimit = (arg as PaginatedTradesQueryParams)?.limit ?? 50;

        const pagination: PaginationInfo = response?.pagination
          ? {
              nextCursor: response.pagination.nextCursor ?? null,
              hasMore: response.pagination.hasMore ?? false,
              limit: response.pagination.limit ?? requestedLimit,
            }
          : {
              // Fallback for legacy backend that returns all trades at once
              nextCursor: null,
              hasMore: false,
              limit: requestedLimit,
            };

        return { trades: mappedTrades, pagination };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.trades.map(({ id }) => ({ type: 'Trades' as const, id })),
              { type: 'Trades', id: 'PAGINATED_LIST' },
            ]
          : [{ type: 'Trades', id: 'PAGINATED_LIST' }],
      async onQueryStarted(_params, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          backgroundCacheStoreTrades(data.trades).catch(() => {});
        } catch {
          // the local cache is best effort
        }
      },
    }),

    createTrade: builder.mutation<Trade, CreateTradePayload>({
      query: (payload) => {
        // Map UI fields to backend API fields
        const backendPayload = {
          symbol: payload.symbol,
          side: payload.direction === 'LONG' ? 'BUY' : 'SELL',
          quantity: payload.size,
          entryPrice: payload.entryPrice ?? 0,
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
          tradeNotes: payload.notes,
          tags: payload.tags,
          // Use accountIds if provided (for multi-account create), else single accountId
          accountIds: payload.accountIds || (payload.accountId ? [payload.accountId] : undefined),
          brokenRuleIds: payload.brokenRuleIds,
          images: payload.images,
          ...mapExtraFieldsToBackend(payload),
        };
        
        return {
          url: '/trades',
          method: 'POST',
          body: backendPayload,
        };
      },
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        const mappedTrade = mapBackendTradeToTrade(trade);
        
        if (response?._apiMessage) {
             Object.defineProperty(mappedTrade, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return mappedTrade;
      },
      invalidatesTags: [{ type: 'Trades', id: 'PAGINATED_LIST' }],
      async onQueryStarted(_, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          insertIntoScopeCaches(dispatch, getState, [data]);
          // Refetch accounts and the lists after a delay to allow the DynamoDB Stream
          // handler and the index to catch up
          debouncedInvalidateStreamDeps(dispatch);
          backgroundCacheStoreTrades([data]).catch(() => {});
        } catch { /* handled elsewhere */ }
      },
    }),

    updateTrade: builder.mutation<{ updatedTrade: Trade; createdTrades: Trade[]; message?: string }, { id: string; payload: Partial<CreateTradePayload> }>({
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
        if (payload.notes !== undefined) backendPayload.tradeNotes = payload.notes;
        if (payload.tags !== undefined) backendPayload.tags = payload.tags;
        // Use accountIds array for update to support multi-account logic
        if (payload.accountIds !== undefined && payload.accountIds.length > 0) {
          backendPayload.accountIds = payload.accountIds;
        } else if (payload.accountId !== undefined) {
          backendPayload.accountIds = [payload.accountId];
        }
        if (payload.brokenRuleIds !== undefined) backendPayload.brokenRuleIds = payload.brokenRuleIds;
        if (payload.images !== undefined) backendPayload.images = payload.images;
        Object.assign(backendPayload, mapExtraFieldsToBackend(payload));
        
        return {
          url: `/trades/${id}`,
          method: 'PUT',
          body: backendPayload,
        };
      },
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        const mappedTrade = mapBackendTradeToTrade(trade);
        // Also map any additional trades created for other accounts
        const createdTrades = response.createdTrades 
          ? response.createdTrades.map(mapBackendTradeToTrade)
          : [];
        
        const result = { updatedTrade: mappedTrade, createdTrades, message: response.message };

        if (response?._apiMessage) {
             Object.defineProperty(result, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return result;
      },
      invalidatesTags: [{ type: 'Trades', id: 'PAGINATED_LIST' }],
      async onQueryStarted({ id }, { dispatch, getState, queryFulfilled }) {
        try {
          // Wait for update to succeed and use the mutation response as the source of truth.
          const { data } = await queryFulfilled;
          const updatedTrade = data.updatedTrade;
          const createdTrades = data.createdTrades || [];

          // Patch all cached getTrades query results in-place (no network refetch).
          const state: any = getState();
          const queries = state?.[api.reducerPath]?.queries || {};
          for (const entry of Object.values<any>(queries)) {
            if (!TRADE_LIST_ENDPOINTS.includes(entry?.endpointName)) continue;

            dispatch(
              (tradesApi.util.updateQueryData as any)(entry.endpointName, entry.originalArgs, (draft: Trade[]) => {
                const index = draft.findIndex((t) => t.id === id);
                if (index !== -1) {
                  draft[index] = updatedTrade;
                }
                // Add any newly created trades (for additional accounts)
                if (createdTrades.length > 0) {
                  draft.push(...createdTrades);
                }
              })
            );
          }

          insertIntoScopeCaches(dispatch, getState, createdTrades);
          // Delayed refetch for account balance (DynamoDB Stream needs time)
          debouncedInvalidateStreamDeps(dispatch);
          backgroundCacheStoreTrades([updatedTrade, ...createdTrades]).catch(() => {});
        } catch {
          // No-op: if update/refetch fails, leave cache as-is.
        }
      },
    }),

    deleteTrade: builder.mutation<{ message: string; trade?: Trade }, string>({
      query: (id) => ({
        url: `/trades/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => {
        const result = {
            message: response.message || 'Deleted',
            trade: response.trade ? mapBackendTradeToTrade(response.trade) : undefined
        };

        if (response?._apiMessage) {
             Object.defineProperty(result, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return result;
      },
      // Only invalidate Stats, Analytics - not Trades (we update cache manually)
      // Accounts invalidated after delay in onQueryStarted (DynamoDB Stream needs time)
      invalidatesTags: (result, error) => {
        if (error) return [];
        return [{ type: 'Trades', id: 'LIST' }, { type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats'];
      },
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        // Optimistic delete from all getTrades caches
        const patchResults: any[] = [];
        const state: any = getState();
        const queries = state?.[api.reducerPath]?.queries || {};
        
        for (const entry of Object.values<any>(queries)) {
          if (!TRADE_LIST_ENDPOINTS.includes(entry?.endpointName)) continue;
          
          const patchResult = dispatch(
            (tradesApi.util.updateQueryData as any)(entry.endpointName, entry.originalArgs, (draft: Trade[]) => {
              const index = draft.findIndex((t) => t.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            })
          );
          patchResults.push(patchResult);
        }
        
        try {
          await queryFulfilled;
          // Delayed refetch for account balance (DynamoDB Stream needs time)
          debouncedInvalidateStreamDeps(dispatch);
          backgroundCacheDeleteTrades([id]).catch(() => {});
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach(patchResult => patchResult.undo());
        }
      },
    }),

    bulkImportTrades: builder.mutation<any, BulkImportPayload>({
      query: (payload) => {
        // Map each item from frontend (CreateTradePayload) to backend API fields
        // Must match the same mapping used in createTrade mutation
        const mappedItems = payload.items.map(item => ({
          symbol: item.symbol,
          side: item.direction === 'LONG' ? 'BUY' : 'SELL',
          quantity: item.size,
          entryPrice: item.entryPrice ?? 0,
          exitPrice: item.exitPrice,
          stopLoss: item.stopLoss || 0,
          takeProfit: item.takeProfit || 0,
          openDate: item.entryDate,
          closeDate: item.exitDate,
          outcome: item.outcome,
          pnl: item.pnl || 0,
          riskRewardRatio: item.riskRewardRatio || 0,
          setupType: item.strategy,
          tradingSession: item.session,
          marketCondition: item.marketCondition,
          newsEvents: item.newsEvents,
          mistakes: item.mistakes,
          lessons: item.keyLesson ? [item.keyLesson] : undefined,
          tradeNotes: item.notes,
          tags: item.tags,
          accountIds: item.accountIds || (item.accountId ? [item.accountId] : undefined),
          brokenRuleIds: item.brokenRuleIds,
          images: item.images,
          ...mapExtraFieldsToBackend(item),
        }));

        return {
          url: '/trades',
          method: 'POST',
          body: { items: mappedItems },
        };
      },
      invalidatesTags: [{ type: 'Trades', id: 'LIST' }, { type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          debouncedInvalidateStreamDeps(dispatch);
          backgroundCacheStoreTrades(data?.trades || []).catch(() => {});
        } catch { /* handled elsewhere */ }
      },
    }),

    /** BE-E1: a deleted trade is soft-deleted for 30 days; this brings it back (E-055). */
    restoreTrades: builder.mutation<{ message?: string }, { trades: Trade[] }>({
      query: ({ trades }) => ({ url: '/trades/restore', method: 'POST', body: { tradeIds: trades.map((t) => t.id) } }),
      async onQueryStarted({ trades }, { dispatch, getState, queryFulfilled }) {
        try {
          await queryFulfilled;
          // The list reads an eventually consistent index, so put the trades back by hand, then refresh later.
          insertIntoScopeCaches(dispatch, getState, trades);
          debouncedInvalidateStreamDeps(dispatch);
        } catch {
          // reported by the caller
        }
      },
    }),

    bulkDeleteTrades: builder.mutation<any, { tradeIds: string[] }>({
      query: (payload) => ({
        url: '/trades/bulk-delete',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Trades', id: 'LIST' }, { type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats'],
      async onQueryStarted({ tradeIds }, { dispatch, getState, queryFulfilled }) {
        // Optimistic delete from all getTrades caches
        const patchResults: any[] = [];
        const state: any = getState();
        const queries = state?.[api.reducerPath]?.queries || {};
        const idsSet = new Set(tradeIds);

        for (const entry of Object.values<any>(queries)) {
          if (!TRADE_LIST_ENDPOINTS.includes(entry?.endpointName)) continue;
          const patchResult = dispatch(
            (tradesApi.util.updateQueryData as any)(entry.endpointName, entry.originalArgs, (draft: Trade[]) => {
              return draft.filter((t) => !idsSet.has(t.id));
            })
          );
          patchResults.push(patchResult);
        }

        try {
          await queryFulfilled;
          debouncedInvalidateStreamDeps(dispatch);
          backgroundCacheDeleteTrades(tradeIds).catch(() => {});
        } catch {
          patchResults.forEach(p => p.undo());
        }
      },
    }),
  }),
});

export const {
  useGetTradesQuery,
  useGetScopeTradesQuery,
  useLazyGetTradesQuery,
  useGetTradesPaginatedQuery,
  useLazyGetTradesPaginatedQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
  useBulkImportTradesMutation,
  useBulkDeleteTradesMutation,
  useRestoreTradesMutation,
} = tradesApi;
