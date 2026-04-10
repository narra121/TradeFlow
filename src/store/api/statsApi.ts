import { api } from './baseApi';
import type { AggregatedStats } from '@/types/stats';

interface StatsParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  includeEquityCurve?: boolean;
  totalCapital?: number;
}

export const statsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<AggregatedStats, StatsParams | void>({
      query: (params) => ({
        url: '/stats',
        params: params || undefined,
      }),
      transformResponse: (response: any): AggregatedStats => {
        // baseApi already unwraps { success, data, message } envelope
        return response as AggregatedStats;
      },
      providesTags: (_result, _error, { accountId, startDate, endDate }) => [
        { type: 'Stats' as const, id: `${accountId}-${startDate}-${endDate}` },
        { type: 'Stats' as const, id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetStatsQuery } = statsApi;
