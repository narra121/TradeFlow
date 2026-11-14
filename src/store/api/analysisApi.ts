import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { api } from './baseApi';
import type { Analysis, AnalysisQuery, QueryResult, WhatIfResult, WhatIfRule } from '@/types/analysis';

/** One account (or ALL) and a period of whole days in the user's time zone. */
export interface AnalysisScope {
  accountId: string;
  from: string;
  to: string;
}

/**
 * `GET /insights/focus` (JournalAWSSetup src/features/focus/routes.ts): `{focus, progress}`. Read loosely, and a 404
 * (a server without the endpoint) is no focus rule. `rule` may also be a behaviour rule (exitAtStop, setStop, pauseAfterLoss).
 */
export interface FocusRule {
  text: string;
  rule?: WhatIfRule | { kind: string };
  startedAt?: string;
  /** Trades checked since the rule started, across all accounts; absent when the server sends none. */
  progress?: { checked: number; kept: number; broken: number };
}

const scopeParams = ({ accountId, from, to }: AnalysisScope) => ({ accountId: accountId || 'ALL', from, to });

export const analysisApi = api.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    /** 422 MIXED_CURRENCY (`error.currencies`) when ALL accounts span currencies: one account must be picked. */
    getAnalysis: builder.query<Analysis, AnalysisScope>({
      query: (scope) => ({ url: '/analysis', params: scopeParams(scope) }),
      transformResponse: (r: { analysis: Analysis }) => r.analysis,
      // Trade writes invalidate 'Stats'; the analysis is built from the same trades.
      providesTags: [{ type: 'Stats', id: 'ANALYSIS' }],
    }),

    whatIf: builder.mutation<WhatIfResult, AnalysisScope & { rule: WhatIfRule }>({
      query: ({ rule, ...scope }) => ({ url: '/analysis/what-if', method: 'POST', body: { ...scopeParams(scope), rule } }),
      transformResponse: (r: { result: WhatIfResult }) => r.result,
    }),

    /** A read through POST (the body carries the question), cached like any query. */
    analysisQuery: builder.query<QueryResult, AnalysisScope & { query: AnalysisQuery }>({
      query: ({ query, ...scope }) => ({ url: '/analysis/query', method: 'POST', body: { ...scopeParams(scope), query } }),
      transformResponse: (r: { result: QueryResult }) => r.result,
      providesTags: [{ type: 'Stats', id: 'ANALYSIS_QUERY' }],
    }),

    /** null when no focus rule is set, and while the server has no such endpoint (404). */
    getFocusRule: builder.query<FocusRule | null, void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const r = await baseQuery('/insights/focus');
        if (r.error) {
          const status = (r.error as FetchBaseQueryError).status;
          return status === 404 ? { data: null } : { error: r.error as FetchBaseQueryError };
        }
        const body = (r.data ?? {}) as { focus?: Partial<FocusRule> | null; progress?: Partial<NonNullable<FocusRule['progress']>> | null } & Partial<FocusRule>;
        const focus = body.focus === undefined ? body : body.focus;
        if (!focus || typeof focus.text !== 'string' || !focus.text.trim()) return { data: null };
        const p = body.progress;
        const progress = p && typeof p.checked === 'number' && typeof p.kept === 'number' && typeof p.broken === 'number' ? { checked: p.checked, kept: p.kept, broken: p.broken } : undefined;
        return { data: { text: focus.text.trim(), rule: focus.rule, startedAt: focus.startedAt, ...(progress ? { progress } : {}) } };
      },
      providesTags: [{ type: 'Stats', id: 'FOCUS' }],
    }),
  }),
});

export const { useGetAnalysisQuery, useWhatIfMutation, useAnalysisQueryQuery, useGetFocusRuleQuery } = analysisApi;
