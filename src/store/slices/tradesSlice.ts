import { createSlice } from '@reduxjs/toolkit';
import { DatePreset } from '@/components/filters/DateRangeFilter';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { endOfDay } from 'date-fns/endOfDay';
import { formatLocalDateOnly } from '@/lib/dateUtils';

export interface TradesState {
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
    datePreset: DatePreset; // Store the preset selection
  };
}

// Default to all time (backend requires startDate/endDate)
const getDefaultDateRange = () => {
  return {
    startDate: '2000-01-01',
    endDate: new Date().toISOString().slice(0, 10),
  };
};

const initialState: TradesState = {
  filters: {
    accountId: 'ALL',
    datePreset: 'all',
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
        datePreset: 'all',
        ...getDefaultDateRange()
      };
    },
  },
});

export const { setFilters, setAccountFilter, setDateRangeFilter, clearFilters } = tradesSlice.actions;
export default tradesSlice.reducer;
