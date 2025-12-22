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
      transformResponse: (response: any) => {
        const goals = response.goals;
        if (response?._apiMessage) {
             Object.defineProperty(goals, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return goals;
      },
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
      transformResponse: (response: any) => {
        const goal = response.goal;
        if (response?._apiMessage) {
             Object.defineProperty(goal, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return goal;
      },
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedGoal } = await queryFulfilled;
          
          // Update the getGoals cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getGoals', undefined, (draft) => {
              const index = draft.findIndex((goal) => goal.goalId === id);
              if (index !== -1) {
                draft[index] = updatedGoal;
              }
            })
          );
          
          // Update the getRulesAndGoals cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getRulesAndGoals', undefined, (draft) => {
              const index = draft.goals.findIndex((goal) => goal.goalId === id);
              if (index !== -1) {
                draft.goals[index] = updatedGoal;
              }
            })
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    
    getRules: builder.query<TradingRule[], void>({
      query: () => '/rules',
      transformResponse: (response: any) => {
        const rules = response.rules;
        if (response?._apiMessage) {
             Object.defineProperty(rules, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return rules;
      },
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
      transformResponse: (response: any) => {
        const rule = response.rule;
        if (response?._apiMessage) {
             Object.defineProperty(rule, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return rule;
      },
      invalidatesTags: [{ type: 'Rules', id: 'LIST' }],
    }),
    
    updateRule: builder.mutation<TradingRule, { id: string; payload: UpdateRulePayload }>({
      query: ({ id, payload }) => ({
        url: `/rules/${id}`,
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => {
        const rule = response.rule;
        if (response?._apiMessage) {
             Object.defineProperty(rule, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return rule;
      },
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedRule } = await queryFulfilled;
          
          // Update the getRules cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getRules', undefined, (draft) => {
              const index = draft.findIndex((rule) => rule.ruleId === id);
              if (index !== -1) {
                draft[index] = updatedRule;
              }
            })
          );
          
          // Update the getRulesAndGoals cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getRulesAndGoals', undefined, (draft) => {
              const index = draft.rules.findIndex((rule) => rule.ruleId === id);
              if (index !== -1) {
                draft.rules[index] = updatedRule;
              }
            })
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    
    toggleRule: builder.mutation<TradingRule, string>({
      query: (id) => ({
        url: `/rules/${id}/toggle`,
        method: 'PUT',
      }),
      transformResponse: (response: any) => {
        const rule = response.rule;
        if (response?._apiMessage) {
             Object.defineProperty(rule, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return rule;
      },
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedRule } = await queryFulfilled;
          
          // Update the getRules cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getRules', undefined, (draft) => {
              const index = draft.findIndex((rule) => rule.ruleId === id);
              if (index !== -1) {
                draft[index] = updatedRule;
              }
            })
          );
          
          // Update the getRulesAndGoals cache
          dispatch(
            goalsRulesApi.util.updateQueryData('getRulesAndGoals', undefined, (draft) => {
              const index = draft.rules.findIndex((rule) => rule.ruleId === id);
              if (index !== -1) {
                draft.rules[index] = updatedRule;
              }
            })
          );
        } catch {
          // Error handled by component
        }
      },
    }),
    
    deleteRule: builder.mutation<{ message: string; rule: TradingRule }, string>({
      query: (id) => ({
        url: `/rules/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => {
        const result = {
            message: response.message || 'Rule deleted successfully',
            rule: response.rule
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
      invalidatesTags: [], // Don't invalidate, use manual cache update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic delete
        const patchResults: any[] = [];
        
        // Delete from getRules cache
        const patchRules = dispatch(
          goalsRulesApi.util.updateQueryData('getRules', undefined, (draft) => {
            const index = draft.findIndex((rule) => rule.ruleId === id);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        patchResults.push(patchRules);
        
        // Delete from getRulesAndGoals cache
        const patchRulesAndGoals = dispatch(
          goalsRulesApi.util.updateQueryData('getRulesAndGoals', undefined, (draft) => {
            const index = draft.rules.findIndex((rule) => rule.ruleId === id);
            if (index !== -1) {
              draft.rules.splice(index, 1);
            }
          })
        );
        patchResults.push(patchRulesAndGoals);
        
        try {
          await queryFulfilled;
          // Success - optimistic update was correct
        } catch {
          // Revert all optimistic updates on error
          patchResults.forEach(patch => patch.undo());
        }
      },
    }),
    
    // Fetch trades for a specific period (for goal calculations)
    getGoalPeriodTrades: builder.query<Trade[], { startDate: string; endDate: string } | undefined>({
      query: (params) => {
        const now = new Date();
        const startDate = params ? params.startDate : startOfMonth(now).toISOString();
        const endDate = params ? params.endDate : endOfMonth(now).toISOString();
        
        return {
          url: '/trades',
          params: {
            accountId: 'ALL',
            startDate,
            endDate
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
          notes: trade.tradeNotes,
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
