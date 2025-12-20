import { api } from './baseApi';
import type {
  Goal,
  TradingRule,
  UpdateGoalPayload,
  CreateRulePayload,
  UpdateRulePayload
} from '@/lib/api';
import type { Trade } from '@/types/trade';
import { startOfMonth, endOfMonth } from 'date-fns';

interface RulesAndGoalsResponse {
  rules: TradingRule[];
  goals: Goal[];
}

export const goalsRulesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRulesAndGoals: builder.query<RulesAndGoalsResponse, void>({
      query: () => '/rules-goals',
      // Provide LIST tags so any goal/rule mutation will refetch this aggregate endpoint.
      providesTags: [
        { type: 'Goals', id: 'LIST' },
        { type: 'Rules', id: 'LIST' },
      ],
    }),
    
    getGoals: builder.query<Goal[], void>({
      query: () => '/goals',
      transformResponse: (response: any) => response.goals,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ goalId }) => ({ type: 'Goals' as const, id: goalId })),
              { type: 'Goals', id: 'LIST' },
            ]
          : [{ type: 'Goals', id: 'LIST' }],
    }),
    
    updateGoal: builder.mutation<Goal, { id: string; payload: UpdateGoalPayload }>({
      query: ({ id, payload }) => ({
        url: `/goals/${id}`,
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.goal,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Goals', id },
        { type: 'Goals', id: 'LIST' },
      ],
    }),
    
    getRules: builder.query<TradingRule[], void>({
      query: () => '/rules',
      transformResponse: (response: any) => response.rules,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ ruleId }) => ({ type: 'Rules' as const, id: ruleId })),
              { type: 'Rules', id: 'LIST' },
            ]
          : [{ type: 'Rules', id: 'LIST' }],
    }),
    
    createRule: builder.mutation<TradingRule, CreateRulePayload>({
      query: (payload) => ({
        url: '/rules',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => response.rule,
      invalidatesTags: [{ type: 'Rules', id: 'LIST' }],
    }),
    
    updateRule: builder.mutation<TradingRule, { id: string; payload: UpdateRulePayload }>({
      query: ({ id, payload }) => ({
        url: `/rules/${id}`,
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.rule,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Rules', id },
        { type: 'Rules', id: 'LIST' },
      ],
    }),
    
    toggleRule: builder.mutation<TradingRule, string>({
      query: (id) => ({
        url: `/rules/${id}/toggle`,
        method: 'PUT',
      }),
      transformResponse: (response: any) => response.rule,
      invalidatesTags: (result, error, id) => [
        { type: 'Rules', id },
        { type: 'Rules', id: 'LIST' },
      ],
    }),
    
    deleteRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Rules', id },
        { type: 'Rules', id: 'LIST' },
      ],
    }),
    
    // Fetch trades for current period (for goal calculations)
    getGoalPeriodTrades: builder.query<Trade[], void>({
      query: () => {
        const now = new Date();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();
        
        return {
          url: '/trades',
          params: {
            accountId: 'ALL',
            startDate: monthStart,
            endDate: monthEnd
          },
        };
      },
      transformResponse: (response: any) => {
        const tradesArray = Array.isArray(response) ? response : (response?.trades || []);
        
        // Map backend response to frontend Trade type
        return tradesArray.map((trade: any) => ({
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
      },
      // Provide LIST tag so trade mutations refetch this query too.
      providesTags: [{ type: 'Trades', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetRulesAndGoalsQuery,
  useGetGoalsQuery,
  useUpdateGoalMutation,
  useGetRulesQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useToggleRuleMutation,
  useDeleteRuleMutation,
  useGetGoalPeriodTradesQuery,
  useLazyGetGoalPeriodTradesQuery,
} = goalsRulesApi;
