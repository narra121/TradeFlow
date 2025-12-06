import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { statsApi, StatsQueryParams, PortfolioStats, DailyStats } from '@/lib/api';
import { handleApiError } from '@/lib/api';

export interface StatsState {
  portfolioStats: PortfolioStats | null;
  dailyStats: DailyStats[];
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  portfolioStats: null,
  dailyStats: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchStats = createAsyncThunk(
  'stats/fetchStats',
  async (params: StatsQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await statsApi.getStats(params);
      return response.stats;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const fetchDailyStats = createAsyncThunk(
  'stats/fetchDailyStats',
  async (params: StatsQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await statsApi.getDailyStats(params);
      return response.dailyStats;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Stats
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.portfolioStats = action.payload;
        state.error = null;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Daily Stats
    builder
      .addCase(fetchDailyStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDailyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = statsSlice.actions;
export default statsSlice.reducer;
