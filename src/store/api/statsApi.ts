import { api } from './baseApi';
import type { StatsQueryParams, PortfolioStats, DailyStats } from '@/lib/api';

export const statsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<PortfolioStats, StatsQueryParams | void>({
      query: (params) => ({
        url: '/stats',
        params,
      }),
      transformResponse: (response: any) => response.stats,
      providesTags: ['Stats'],
    }),
    
    getDailyStats: builder.query<DailyStats[], StatsQueryParams | void>({
      query: (params) => ({
        url: '/stats/daily',
        params,
      }),
      transformResponse: (response: any) => response.dailyStats,
      providesTags: ['Stats'],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useLazyGetStatsQuery,
  useGetDailyStatsQuery,
  useLazyGetDailyStatsQuery,
} = statsApi;
