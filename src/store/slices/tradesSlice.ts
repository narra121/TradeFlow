import { createSlice } from '@reduxjs/toolkit';
import { DatePreset } from '@/components/filters/DateRangeFilter';
import { startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { formatLocalDateOnly } from '@/lib/dateUtils';

export interface TradesState {
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
    datePreset: DatePreset; // Store the preset selection
  };
}

// Default to this week
const getDefaultDateRange = () => {
  const now = new Date();
  const startDate = startOfWeek(now, { weekStartsOn: 1 });
  const endDate = endOfDay(endOfWeek(now, { weekStartsOn: 1 }));
  return {
    startDate: formatLocalDateOnly(startDate),
    endDate: formatLocalDateOnly(endDate)
  };
};

const initialState: TradesState = {
  filters: {
    accountId: 'ALL',
    datePreset: 'thisWeek',
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
        datePreset: 'thisWeek',
        ...getDefaultDateRange()
      };
    },
  },
});

export const { setFilters, setAccountFilter, setDateRangeFilter, clearFilters } = tradesSlice.actions;
export default tradesSlice.reducer;
