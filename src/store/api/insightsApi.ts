import type { GenerateInsightRequest, Insight, ListInsightsParams, ListInsightsResponse } from '@/types/insights';
import { api } from './baseApi';

const apiWithTags = api.enhanceEndpoints({ addTagTypes: ['Insights', 'Entitlements'] });

export const insightsApi = apiWithTags.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    /** Same inputs and same data return the stored insight without using quota. 422 NOT_ENOUGH_TRADES below 5 trades. */
    generateInsight: builder.mutation<Insight, GenerateInsightRequest>({
      query: (body) => ({ url: '/insights/generate', method: 'POST', body }),
      transformResponse: (r: { insight: Insight }) => r.insight,
      invalidatesTags: [{ type: 'Insights', id: 'LIST' }, 'Entitlements'],
    }),

    listInsights: builder.query<ListInsightsResponse, ListInsightsParams | void>({
      query: (params) => ({ url: '/insights', params: params || undefined }),
      providesTags: (r) => [{ type: 'Insights', id: 'LIST' }, ...(r?.insights ?? []).map((i) => ({ type: 'Insights' as const, id: i.id }))],
    }),
  }),
});

export const { useGenerateInsightMutation, useListInsightsQuery, useLazyListInsightsQuery } = insightsApi;
