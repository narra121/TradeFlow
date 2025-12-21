import { api } from './baseApi';
import type {
  HourlyStats,
  DailyWinRate,
  SymbolDistribution,
  StrategyDistribution
} from '@/lib/api';

interface AnalyticsParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

interface HourlyStatsResponse {
  hourlyStats: HourlyStats[];
  bestHour: HourlyStats | null;
  worstHour: HourlyStats | null;
}

interface DailyWinRateResponse {
  dailyWinRate: DailyWinRate[];
  totalDays: number;
  overallWinRate: number;
}

interface SymbolDistributionResponse {
  symbols: SymbolDistribution[];
  totalSymbols: number;
  mostTraded: SymbolDistribution | null;
  mostProfitable: SymbolDistribution | null;
}

interface StrategyDistributionResponse {
  strategies: StrategyDistribution[];
  totalStrategies: number;
  mostUsed: StrategyDistribution | null;
  mostProfitable: StrategyDistribution | null;
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHourlyStats: builder.query<HourlyStatsResponse, AnalyticsParams | void>({
      query: (params) => ({
        url: '/analytics/hourly-stats',
        params: params || undefined,
      }),
      providesTags: ['Analytics'],
    }),
    
    getDailyWinRate: builder.query<DailyWinRateResponse, AnalyticsParams | void>({
      query: (params) => ({
        url: '/analytics/daily-win-rate',
        params: params || undefined,
      }),
      providesTags: ['Analytics'],
    }),
    
    getSymbolDistribution: builder.query<SymbolDistributionResponse, AnalyticsParams | void>({
      query: (params) => ({
        url: '/analytics/symbol-distribution',
        params: params || undefined,
      }),
      providesTags: ['Analytics'],
    }),
    
    getStrategyDistribution: builder.query<StrategyDistributionResponse, AnalyticsParams | void>({
      query: (params) => ({
        url: '/analytics/strategy-distribution',
        params: params || undefined,
      }),
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetHourlyStatsQuery,
  useLazyGetHourlyStatsQuery,
  useGetDailyWinRateQuery,
  useLazyGetDailyWinRateQuery,
  useGetSymbolDistributionQuery,
  useLazyGetSymbolDistributionQuery,
  useGetStrategyDistributionQuery,
  useLazyGetStrategyDistributionQuery,
} = analyticsApi;
