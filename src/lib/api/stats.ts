import apiClient from './api';

export interface PortfolioStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRiskReward: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
}

export interface StatsQueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

export const statsApi = {
  // GET /v1/stats
  getStats: async (params?: StatsQueryParams): Promise<{ stats: PortfolioStats }> => {
    return apiClient.get('/stats', { params });
  },

  // GET /v1/stats/daily
  getDailyStats: async (params?: StatsQueryParams): Promise<{ dailyStats: DailyStats[] }> => {
    return apiClient.get('/stats/daily', { params });
  },
};
