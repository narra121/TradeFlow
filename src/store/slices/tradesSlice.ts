import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tradesApi, CreateTradePayload, TradesQueryParams, BulkImportPayload } from '@/lib/api';
import { handleApiError } from '@/lib/api';
import { Trade } from '@/types/trade';

export interface TradesState {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
  };
}

// Default to last 30 days
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

const initialState: TradesState = {
  trades: [],
  loading: false,
  error: null,
  filters: {
    accountId: 'ALL',
    ...getDefaultDateRange()
  },
};

// Async thunks
export const fetchTrades = createAsyncThunk(
  'trades/fetchTrades',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const filters = state.trades.filters;
      const response = await tradesApi.getTrades(filters);
      return response.trades;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const createTrade = createAsyncThunk(
  'trades/createTrade',
  async (payload: CreateTradePayload, { rejectWithValue }) => {
    try {
      const response = await tradesApi.createTrade(payload);
      return response.trade;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateTrade = createAsyncThunk(
  'trades/updateTrade',
  async ({ id, payload }: { id: string; payload: Partial<CreateTradePayload> }, { rejectWithValue }) => {
    try {
      const response = await tradesApi.updateTrade(id, payload);
      return response.trade;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteTrade = createAsyncThunk(
  'trades/deleteTrade',
  async (id: string, { rejectWithValue }) => {
    try {
      await tradesApi.deleteTrade(id);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const bulkImportTrades = createAsyncThunk(
  'trades/bulkImportTrades',
  async (payload: BulkImportPayload, { rejectWithValue }) => {
    try {
      const response = await tradesApi.bulkImportTrades(payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getUploadUrl = createAsyncThunk(
  'trades/getUploadUrl',
  async (_, { rejectWithValue }) => {
    try {
      const response = await tradesApi.getUploadUrl();
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setAccountFilter: (state, action) => {
      state.filters.accountId = action.payload || 'ALL';
    },
    setDateRangeFilter: (state, action) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
    },
    clearFilters: (state) => {
      state.filters = {
        accountId: 'ALL',
        ...getDefaultDateRange()
      };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Trades
    builder
      .addCase(fetchTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload;
        state.error = null;
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Trade
    builder
      .addCase(createTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTrade.fulfilled, (state, action) => {
        state.loading = false;
        state.trades.unshift(action.payload);
        state.error = null;
      })
      .addCase(createTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Trade
    builder
      .addCase(updateTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTrade.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.trades.findIndex(trade => trade.id === action.payload.id);
        if (index !== -1) {
          state.trades[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Trade
    builder
      .addCase(deleteTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTrade.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = state.trades.filter(trade => trade.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Bulk Import Trades
    builder
      .addCase(bulkImportTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkImportTrades.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Note: Refetch trades after import
      })
      .addCase(bulkImportTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Get Upload URL
    builder
      .addCase(getUploadUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUploadUrl.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(getUploadUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, setAccountFilter, setDateRangeFilter, clearFilters, clearError } = tradesSlice.actions;
export default tradesSlice.reducer;
