import apiClient from './api';

export interface HourlyStats {
  hour: number;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface DailyWinRate {
  date: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
}

export interface SymbolDistribution {
  symbol: string;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface StrategyDistribution {
  strategy: string;
  count: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface AnalyticsQueryParams {
  type: 'hourly' | 'daily-win-rate' | 'symbol-distribution' | 'strategy-distribution';
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export const analyticsApi = {
  // GET /v1/analytics?type=hourly
  getHourlyStats: async (params?: Omit<AnalyticsQueryParams, 'type'>): Promise<{
    success: boolean;
    data: {
      hourlyStats: HourlyStats[];
      bestHour: HourlyStats;
      worstHour: HourlyStats;
    };
  }> => {
    return apiClient.get('/analytics', { params: { ...params, type: 'hourly' } });
  },

  // GET /v1/analytics?type=daily-win-rate
  getDailyWinRate: async (params?: Omit<AnalyticsQueryParams, 'type'>): Promise<{
    success: boolean;
    data: {
      dailyWinRate: DailyWinRate[];
      totalDays: number;
      overallWinRate: number;
    };
  }> => {
    return apiClient.get('/analytics', { params: { ...params, type: 'daily-win-rate' } });
  },

  // GET /v1/analytics?type=symbol-distribution
  getSymbolDistribution: async (params?: Omit<AnalyticsQueryParams, 'type'>): Promise<{
    success: boolean;
    data: {
      symbols: SymbolDistribution[];
      totalSymbols: number;
      mostTraded: SymbolDistribution;
      mostProfitable: SymbolDistribution;
    };
  }> => {
    return apiClient.get('/analytics', { params: { ...params, type: 'symbol-distribution' } });
  },

  // GET /v1/analytics?type=strategy-distribution
  getStrategyDistribution: async (params?: Omit<AnalyticsQueryParams, 'type'>): Promise<{
    success: boolean;
    data: {
      strategies: StrategyDistribution[];
      totalStrategies: number;
      mostUsed: StrategyDistribution;
      mostProfitable: StrategyDistribution;
    };
  }> => {
    return apiClient.get('/analytics', { params: { ...params, type: 'strategy-distribution' } });
  },
};
