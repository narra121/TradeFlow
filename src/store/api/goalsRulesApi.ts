import { api } from './baseApi';
import type {
  Goal,
  TradingRule,
  UpdateGoalPayload,
  CreateRulePayload,
  UpdateRulePayload
} from '@/lib/api';
interface GoalProgressItem {
  current: number;
  target: number;
  progress: number;
  achieved: boolean;
}

interface GoalsProgressResponse {
  goalProgress: {
    profit: GoalProgressItem;
    winRate: GoalProgressItem;
    maxDrawdown: GoalProgressItem;
    tradeCount: GoalProgressItem;
  };
  ruleCompliance: {
    totalRules: number;
    followedCount: number;
    brokenRulesCounts: Record<string, number>;
  };
  goals: Goal[];
  rules: TradingRule[];
}

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
    
    getGoalsProgress: builder.query<GoalsProgressResponse, {
      accountId: string;
      startDate: string;
      endDate: string;
      period: 'weekly' | 'monthly';
    }>({
      query: (params) => ({ url: '/goals/progress', params }),
      providesTags: ['Goals', 'Rules', 'Stats'],
    }),
  }),
});

export const {
  useGetRulesAndGoalsQuery,
  useUpdateGoalMutation,
  useGetRulesQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useToggleRuleMutation,
  useDeleteRuleMutation,
  useGetGoalsProgressQuery,
} = goalsRulesApi;
