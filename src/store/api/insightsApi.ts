import type {
  Focus,
  GenerateInsightRequest,
  Insight,
  InsightFeedbackRequest,
  InsightSettings,
  ListInsightsParams,
  ListInsightsResponse,
  SetFocusRequest,
} from '@/types/insights';
import { analysisApi } from './analysisApi';
import { api } from './baseApi';

const apiWithTags = api.enhanceEndpoints({ addTagTypes: ['Insights', 'InsightSettings', 'Entitlements'] });

export const insightsApi = apiWithTags.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    /**
     * Same inputs and same data return the stored insight without using quota. 422 NOT_ENOUGH_TRADES below 5 trades;
     * 422 MIXED_CURRENCY (`error.currencies`) for all accounts in more than one currency without `currency`.
     */
    generateInsight: builder.mutation<Insight, GenerateInsightRequest>({
      query: (body) => ({ url: '/insights/generate', method: 'POST', body }),
      transformResponse: (r: { insight: Insight }) => r.insight,
      invalidatesTags: [{ type: 'Insights', id: 'LIST' }, 'Entitlements'],
    }),

    listInsights: builder.query<ListInsightsResponse, ListInsightsParams | void>({
      query: (params) => ({ url: '/insights', params: params || undefined }),
      providesTags: (r) => [{ type: 'Insights', id: 'LIST' }, ...(r?.insights ?? []).map((i) => ({ type: 'Insights' as const, id: i.id }))],
    }),

    getInsight: builder.query<Insight, string>({
      query: (id) => `/insights/${encodeURIComponent(id)}`,
      transformResponse: (r: { insight: Insight }) => r.insight,
      providesTags: (_r, _e, id) => [{ type: 'Insights', id }],
    }),

    getInsightSettings: builder.query<InsightSettings, void>({
      query: () => '/insights/settings',
      transformResponse: (r: { settings?: Partial<InsightSettings> }) => ({ useNotes: r?.settings?.useNotes === true }),
      providesTags: ['InsightSettings'],
    }),

    /** Shown switched at once; put back if the server refuses. */
    setInsightSettings: builder.mutation<InsightSettings, InsightSettings>({
      query: (body) => ({ url: '/insights/settings', method: 'PUT', body }),
      transformResponse: (r: { settings?: Partial<InsightSettings> }) => ({ useNotes: r?.settings?.useNotes === true }),
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        const patch = dispatch(insightsApi.util.updateQueryData('getInsightSettings', undefined, () => body));
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    /**
     * Useful lifts a mute; Not useful mutes the finding for 30 days. The answer is written into every cached copy of the
     * insight at once and taken back if the request fails.
     */
    sendInsightFeedback: builder.mutation<{ key: string; useful: boolean; mutedUntil: string | null }, InsightFeedbackRequest>({
      query: ({ id, key, useful }) => ({ url: `/insights/${encodeURIComponent(id)}/feedback`, method: 'POST', body: { key, useful } }),
      async onQueryStarted({ id, key, useful }, { dispatch, getState, queryFulfilled }) {
        const mark = (i: Insight) => {
          if (i.id === id) i.feedback = { ...(i.feedback ?? {}), [key]: useful };
        };
        const patches = [
          ...insightsApi.util.selectCachedArgsForQuery(getState(), 'listInsights').map((args) =>
            dispatch(insightsApi.util.updateQueryData('listInsights', args, (d) => d.insights.forEach(mark))),
          ),
          dispatch(insightsApi.util.updateQueryData('getInsight', id, mark)),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),

    /** Replaces the one active focus rule; the focus read by Analytics and the review is updated from the answer. */
    setFocus: builder.mutation<Focus, SetFocusRequest>({
      query: (body) => ({ url: '/insights/focus', method: 'PUT', body }),
      transformResponse: (r: { focus: Focus }) => r.focus,
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(analysisApi.util.upsertQueryData('getFocusRule', undefined, { text: data.text, rule: data.rule, startedAt: data.startedAt }));
        } catch {
          // the mutation's own error is shown by the caller
        }
      },
      // Progress since the new start is recounted by the server; the trade debrief's daily-cap check reads the rule.
      invalidatesTags: (r) => (r ? [{ type: 'Stats', id: 'FOCUS' }, { type: 'Trades', id: 'DEBRIEF' }] : []),
    }),
  }),
});

export const {
  useGenerateInsightMutation,
  useListInsightsQuery,
  useLazyListInsightsQuery,
  useGetInsightQuery,
  useGetInsightSettingsQuery,
  useSetInsightSettingsMutation,
  useSendInsightFeedbackMutation,
  useSetFocusMutation,
} = insightsApi;
