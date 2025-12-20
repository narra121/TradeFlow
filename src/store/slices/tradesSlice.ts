import { createSlice } from '@reduxjs/toolkit';
import { DatePreset } from '@/components/filters/DateRangeFilter';

export interface TradesState {
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
    datePreset: DatePreset; // Store the preset selection
  };
}

// Default to last 30 days
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    endDate: endDate.toISOString().split('T')[0]      // Format as YYYY-MM-DD
  };
};

const initialState: TradesState = {
  filters: {
    accountId: 'ALL',
    datePreset: 30,
    ...getDefaultDateRange()
  },
};

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
      if (action.payload.datePreset !== undefined) {
        state.filters.datePreset = action.payload.datePreset;
      }
    },
    clearFilters: (state) => {
      state.filters = {
        accountId: 'ALL',
        datePreset: 30,
        ...getDefaultDateRange()
      };
    },
  },
});

export const { setFilters, setAccountFilter, setDateRangeFilter, clearFilters } = tradesSlice.actions;
export default tradesSlice.reducer;
