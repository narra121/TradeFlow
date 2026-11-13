/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { api } from './baseApi';
import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';
import { wallToInstant } from '@/lib/appTimeZone';

// DynamoDB Streams are async — after a trade mutation the stream handler
// recalculates account balances and DailyStats (which goals/rules progress
// depend on), but it hasn't finished by the time the mutation response
// arrives.  A short delay before refetching gives the stream handler time
// to write the updated data.  The trade lists are not refetched: every
// mutation below patches them in place.
const STREAM_PROPAGATION_DELAY_MS = 4000;

let streamDebounceTimer: ReturnType<typeof setTimeout>;
const debouncedInvalidateStreamDeps = (dispatch: any) => {
  clearTimeout(streamDebounceTimer);
  streamDebounceTimer = setTimeout(() => {
    dispatch(api.util.invalidateTags(['Accounts', 'Goals', 'Rules', 'SavedOptions', 'Stats']));
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
export const TRADE_LIST_ENDPOINTS = ['getScopeTrades'];

type ScopeArgs = { accountId?: string; startDate?: string; endDate?: string; importBatchId?: string };
const tradeDay = (t: Trade) => (t.exitDate || t.entryDate || '').slice(0, 10);

/** Whether a trade belongs in a scope list. The list of one import batch only changes by refetch. */
const inScope = ({ accountId, startDate, endDate, importBatchId }: ScopeArgs, t: Trade) => {
  if (importBatchId) return false;
  if (accountId && accountId !== 'ALL' && t.accountId !== accountId) return false;
  const day = tradeDay(t);
  return (!startDate || day >= startDate) && (!endDate || day <= endDate);
};

/** Adds saved trades to every cached scope list they belong to; the list endpoint reads an eventually consistent index, so an immediate refetch can miss them. */
const insertIntoScopeCaches = (dispatch: any, getState: any, trades: Trade[]) => {
  const queries = getState()?.[api.reducerPath]?.queries || {};
  for (const entry of Object.values<any>(queries)) {
    if (entry?.endpointName !== 'getScopeTrades') continue;
    const fits = trades.filter((t) => inScope(entry.originalArgs ?? {}, t));
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

/**
 * A day (YYYY-MM-DD) as the instant it starts or ends on the app zone's clock. The backend reads the openDate index in UTC
 * and takes an ISO instant as it is, so a local day sent as a bare date would drop a New York evening trade (next UTC day)
 * or an Indian early-morning one (previous UTC day).
 */
export function dayBound(day: string, edge: 'start' | 'end'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (edge === 'start') return wallToInstant({ year: y, month: mo, day: d, hour: 0, minute: 0 }).toISOString();
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  return new Date(wallToInstant({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour: 0, minute: 0 }).getTime() - 1).toISOString();
}

type ScopeResult = { data?: unknown; error?: any };
type ScopeFetch = (arg: { url: string; params: Record<string, unknown> }) => ScopeResult | PromiseLike<ScopeResult>;

/** Pages `/trades` (newest first) until `max` trades are read; the default is the scope ceiling. */
export async function fetchAllScopeTrades(
  params: ScopeArgs,
  fetchPage: ScopeFetch,
  max = SCOPE_TRADE_CEILING,
): Promise<{ data: Trade[] } | { error: any }> {
  const all: Trade[] = [];
  let cursor: string | undefined;
  const pageSize = Math.min(SCOPE_PAGE_SIZE, max);
  for (let page = 0; page <= Math.ceil(max / pageSize); page++) {
    const res = await fetchPage({ url: '/trades', params: { ...params, startDate: dayBound(params.startDate || OPEN_START, 'start'), endDate: dayBound(params.endDate || OPEN_END, 'end'), limit: pageSize, ...(cursor ? { cursor } : {}) } });
    if (res.error) return { error: res.error };
    const body: any = res.data;
    const list: any[] = Array.isArray(body) ? body : body?.trades ?? [];
    all.push(...list.map(mapBackendTradeToTrade));
    cursor = body?.pagination?.hasMore ? body.pagination.nextCursor ?? undefined : undefined;
    if (!cursor || all.length >= max) break;
  }
  return { data: all.slice(0, max) };
}

export const tradesApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    /** Every trade in the scope (account + date range): pages `/trades` to completion, newest 5,000 at most. */
    getScopeTrades: builder.query<Trade[], ScopeArgs>({
      queryFn: (params, _api, _extra, fetchWithBQ) => fetchAllScopeTrades(params, fetchWithBQ),
      providesTags: (result) => [
        ...(result ?? []).map(({ id }) => ({ type: 'Trades' as const, id })),
        { type: 'Trades' as const, id: 'LIST' },
      ],
    }),

    /** The newest trade of the scope, one request: what Calendar needs to open on its latest month. Refetched when a trade is written. */
    getNewestTrade: builder.query<Trade[], ScopeArgs>({
      queryFn: (params, _api, _extra, fetchWithBQ) => fetchAllScopeTrades(params, fetchWithBQ, 1),
      providesTags: [{ type: 'Trades', id: 'PAGINATED_LIST' }],
    }),

    // `idempotencyKey` goes in the `Idempotency-Key` header, so a repeated request returns the trade it already created.
    // The API answers `{ trade }` for one account and `{ trades, count }` for several: here always a list, one trade per account.
    createTrade: builder.mutation<Trade[], CreateTradePayload & { idempotencyKey?: string }>({
      query: ({ idempotencyKey, ...payload }) => {
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
          ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
        };
      },
      transformResponse: (response: any): Trade[] => {
        const list: any[] = Array.isArray(response?.trades) ? response.trades : [response?.trade ?? response];
        return list.map(mapBackendTradeToTrade);
      },
      invalidatesTags: [{ type: 'Trades', id: 'PAGINATED_LIST' }],
      async onQueryStarted(_, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          insertIntoScopeCaches(dispatch, getState, data);
          // Refetch accounts and stats after a delay to allow the DynamoDB Stream handler to catch up
          debouncedInvalidateStreamDeps(dispatch);
        } catch { /* handled elsewhere */ }
      },
    }),

    /** One trade by id, for a trade the scope list does not hold. Any trade write refetches it through the list tag. */
    getTrade: builder.query<Trade, string>({
      query: (id) => `/trades/${id}`,
      // The list endpoint answers an image's `id` as its S3 key; this one returns the stored record, so do the same here.
      transformResponse: (response: any) => {
        const trade = response.trade || response;
        return mapBackendTradeToTrade({ ...trade, images: (trade.images ?? []).map((im: any) => (im.key ? { ...im, id: im.key } : im)) });
      },
      providesTags: (_result, _error, id) => [{ type: 'Trades', id }, { type: 'Trades', id: 'PAGINATED_LIST' }],
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

        return { updatedTrade: mappedTrade, createdTrades, message: response.message };
      },
      async onQueryStarted({ id }, { dispatch, getState, queryFulfilled }) {
        try {
          // Wait for update to succeed and use the mutation response as the source of truth.
          const { data } = await queryFulfilled;
          const updatedTrade = data.updatedTrade;
          const createdTrades = data.createdTrades || [];

          // Patch every cached scope list in place (no network refetch).
          const state: any = getState();
          const queries = state?.[api.reducerPath]?.queries || {};
          const entries = Object.values<any>(queries).filter((e) => TRADE_LIST_ENDPOINTS.includes(e?.endpointName));
          const before: Trade | undefined = entries.flatMap((e) => (e.data ?? []) as Trade[]).find((t) => t.id === id);
          // A trade that changed account or day may have left some lists and belong in others.
          const moved = !!before && (before.accountId !== updatedTrade.accountId || tradeDay(before) !== tradeDay(updatedTrade));
          for (const entry of entries) {
            dispatch(
              (tradesApi.util.updateQueryData as any)(entry.endpointName, entry.originalArgs, (draft: Trade[]) => {
                const index = draft.findIndex((t) => t.id === id);
                if (index === -1) return;
                if (moved && !inScope(entry.originalArgs ?? {}, updatedTrade)) draft.splice(index, 1);
                else draft[index] = updatedTrade;
              })
            );
          }

          // The copies for other accounts go only into the lists they belong to.
          insertIntoScopeCaches(dispatch, getState, moved ? [updatedTrade, ...createdTrades] : createdTrades);
          // Delayed refetch for account balance (DynamoDB Stream needs time)
          debouncedInvalidateStreamDeps(dispatch);
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
      transformResponse: (response: any) => ({
        message: response.message || 'Deleted',
        trade: response.trade ? mapBackendTradeToTrade(response.trade) : undefined,
      }),
      // Not Trades/LIST: the lists are patched below. Accounts are invalidated after a delay (DynamoDB Stream needs time).
      invalidatesTags: (_result, error) => (error ? [] : [{ type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats']),
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
        } catch {
          // Revert optimistic updates on error
          patchResults.forEach(patchResult => patchResult.undo());
        }
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

    /**
     * One change set for up to 200 trades (BE bulk-update). The server merges `add` / `remove` into each trade's lists, so two
     * quick edits cannot overwrite each other. `patches` (id -> changed fields) is not sent: it updates the cached lists.
     */
    bulkUpdateTrades: builder.mutation<
      { updated: number; updatedIds: string[]; notFound: string[]; failed: { tradeId: string; message: string }[] },
      { tradeIds: string[]; set?: Record<string, string | null>; add?: Record<string, string[]>; remove?: Record<string, string[]>; patches: Record<string, Partial<Trade>> }
    >({
      query: ({ patches: _patches, ...body }) => ({ url: '/trades/bulk-update', method: 'POST', body }),
      transformResponse: (r: any) => ({ updated: r?.updated ?? 0, updatedIds: r?.updatedIds ?? [], notFound: r?.notFound ?? [], failed: r?.failed ?? [] }),
      async onQueryStarted({ patches }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const queries = (getState() as any)?.[api.reducerPath]?.queries || {};
          for (const entry of Object.values<any>(queries)) {
            if (!TRADE_LIST_ENDPOINTS.includes(entry?.endpointName)) continue;
            dispatch(
              (tradesApi.util.updateQueryData as any)(entry.endpointName, entry.originalArgs, (draft: Trade[]) => {
                for (const id of data.updatedIds) {
                  const trade = draft.find((t) => t.id === id);
                  if (trade && patches[id]) Object.assign(trade, patches[id]);
                }
              }),
            );
          }
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
      invalidatesTags: [{ type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats'],
      async onQueryStarted({ tradeIds }, { dispatch, getState, queryFulfilled }) {
        // Optimistic delete from all getTrades caches
        const patchResults: any[] = [];
        const state: any = getState();
        const queries = state?.[api.reducerPath]?.queries || {};
        const idsSet = new Set(tradeIds);
        const removed = new Map<string, Trade>();
        for (const entry of Object.values<any>(queries)) {
          if (!TRADE_LIST_ENDPOINTS.includes(entry?.endpointName)) continue;
          for (const t of (entry.data ?? []) as Trade[]) if (idsSet.has(t.id)) removed.set(t.id, t);
        }

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
          const { data } = await queryFulfilled;
          // A 200 can carry per-trade failures (`errors`): those trades still exist, so they go back into the lists.
          const failed = ((data?.errors ?? []) as { tradeId: string }[]).map((e) => removed.get(e.tradeId)).filter((t): t is Trade => !!t);
          if (failed.length) insertIntoScopeCaches(dispatch, getState, failed);
          debouncedInvalidateStreamDeps(dispatch);
        } catch {
          patchResults.forEach(p => p.undo());
        }
      },
    }),
  }),
});

export const {
  useGetScopeTradesQuery,
  useGetNewestTradeQuery,
  useCreateTradeMutation,
  useGetTradeQuery,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
  useBulkDeleteTradesMutation,
  useBulkUpdateTradesMutation,
  useRestoreTradesMutation,
} = tradesApi;
