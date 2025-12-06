import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  analyticsApi, 
  HourlyStats, 
  DailyWinRate, 
  SymbolDistribution, 
  StrategyDistribution 
} from '@/lib/api';
import { handleApiError } from '@/lib/api';

export interface AnalyticsState {
  hourlyStats: {
    data: HourlyStats[];
    bestHour: HourlyStats | null;
    worstHour: HourlyStats | null;
  };
  dailyWinRate: {
    data: DailyWinRate[];
    totalDays: number;
    overallWinRate: number;
  };
  symbolDistribution: {
    symbols: SymbolDistribution[];
    totalSymbols: number;
    mostTraded: SymbolDistribution | null;
    mostProfitable: SymbolDistribution | null;
  };
  strategyDistribution: {
    strategies: StrategyDistribution[];
    totalStrategies: number;
    mostUsed: StrategyDistribution | null;
    mostProfitable: StrategyDistribution | null;
  };
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  hourlyStats: {
    data: [],
    bestHour: null,
    worstHour: null,
  },
  dailyWinRate: {
    data: [],
    totalDays: 0,
    overallWinRate: 0,
  },
  symbolDistribution: {
    symbols: [],
    totalSymbols: 0,
    mostTraded: null,
    mostProfitable: null,
  },
  strategyDistribution: {
    strategies: [],
    totalStrategies: 0,
    mostUsed: null,
    mostProfitable: null,
  },
  loading: false,
  error: null,
};

// Async thunks
export const fetchHourlyStats = createAsyncThunk(
  'analytics/fetchHourlyStats',
  async (params: { accountId?: string; startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await analyticsApi.getHourlyStats(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchDailyWinRate = createAsyncThunk(
  'analytics/fetchDailyWinRate',
  async (params: { accountId?: string; startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await analyticsApi.getDailyWinRate(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchSymbolDistribution = createAsyncThunk(
  'analytics/fetchSymbolDistribution',
  async (params: { accountId?: string; startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await analyticsApi.getSymbolDistribution(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchStrategyDistribution = createAsyncThunk(
  'analytics/fetchStrategyDistribution',
  async (params: { accountId?: string; startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await analyticsApi.getStrategyDistribution(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Hourly Stats
    builder
      .addCase(fetchHourlyStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHourlyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.hourlyStats = {
          data: action.payload.hourlyStats,
          bestHour: action.payload.bestHour,
          worstHour: action.payload.worstHour,
        };
        state.error = null;
      })
      .addCase(fetchHourlyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Daily Win Rate
    builder
      .addCase(fetchDailyWinRate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyWinRate.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyWinRate = {
          data: action.payload.dailyWinRate,
          totalDays: action.payload.totalDays,
          overallWinRate: action.payload.overallWinRate,
        };
        state.error = null;
      })
      .addCase(fetchDailyWinRate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Symbol Distribution
    builder
      .addCase(fetchSymbolDistribution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSymbolDistribution.fulfilled, (state, action) => {
        state.loading = false;
        state.symbolDistribution = {
          symbols: action.payload.symbols,
          totalSymbols: action.payload.totalSymbols,
          mostTraded: action.payload.mostTraded,
          mostProfitable: action.payload.mostProfitable,
        };
        state.error = null;
      })
      .addCase(fetchSymbolDistribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Strategy Distribution
    builder
      .addCase(fetchStrategyDistribution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStrategyDistribution.fulfilled, (state, action) => {
        state.loading = false;
        state.strategyDistribution = {
          strategies: action.payload.strategies,
          totalStrategies: action.payload.totalStrategies,
          mostUsed: action.payload.mostUsed,
          mostProfitable: action.payload.mostProfitable,
        };
        state.error = null;
      })
      .addCase(fetchStrategyDistribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
