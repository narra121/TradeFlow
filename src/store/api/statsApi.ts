import { api } from './baseApi';
import type { StatsQueryParams, PortfolioStats, DailyStats } from '@/lib/api';

export const statsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<PortfolioStats, StatsQueryParams | void>({
      query: (params) => ({
        url: '/stats',
        params: params || undefined,
      }),
      transformResponse: (response: any) => {
        const stats = response.stats;
        if (response?._apiMessage) {
             Object.defineProperty(stats, '_apiMessage', {
                value: response._apiMessage,
                enumerable: false,
                writable: true,
                configurable: true
            });
        }
        return stats;
      },
      providesTags: ['Stats'],
    }),
    
    getDailyStats: builder.query<DailyStats[], StatsQueryParams | void>({
      query: (params) => ({
        url: '/stats/daily',
        params: params || undefined,
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
