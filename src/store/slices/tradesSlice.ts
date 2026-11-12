import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DatePreset, loadScope, resolveRange } from '@/lib/scope';
import { readUiState } from '@/hooks/useUiState';

export interface TradesState {
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
    datePreset: DatePreset;
    customFrom?: string;
    customTo?: string;
  };
}

function buildFilters(accountId: string, preset: DatePreset, customFrom?: string, customTo?: string): TradesState['filters'] {
  const base = { accountId, datePreset: preset, ...resolveRange(preset, customFrom, customTo) };
  return preset === 'custom' && customFrom && customTo ? { ...base, customFrom, customTo } : base;
}

function initialFilters(): TradesState['filters'] {
  const saved = loadScope();
  if (!saved) return buildFilters('ALL', readUiState().defaultPeriod);
  return buildFilters(saved.accountId || 'ALL', saved.datePreset, saved.customFrom, saved.customTo);
}

const tradesSlice = createSlice({
  name: 'trades',
  initialState: (): TradesState => ({ filters: initialFilters() }),
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setAccountFilter: (state, action: PayloadAction<string | null | undefined>) => {
      state.filters.accountId = action.payload || 'ALL';
    },
    setDateRangeFilter: (
      state,
      action: PayloadAction<{ startDate: string; endDate: string; datePreset?: DatePreset }>,
    ) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
      if (action.payload.datePreset !== undefined) {
        state.filters.datePreset = action.payload.datePreset;
        if (action.payload.datePreset === 'custom') {
          state.filters.customFrom = action.payload.startDate;
          state.filters.customTo = action.payload.endDate;
        }
      }
    },
    /** Recomputes relative presets so a tab left open past midnight does not keep yesterday's end date. */
    rollDate: (state) => {
      const { datePreset, customFrom, customTo } = state.filters;
      const next = resolveRange(datePreset, customFrom, customTo);
      if (next.endDate !== state.filters.endDate || next.startDate !== state.filters.startDate) {
        state.filters.startDate = next.startDate;
        state.filters.endDate = next.endDate;
      }
    },
    clearFilters: (state) => {
      state.filters = buildFilters('ALL', 'all');
    },
  },
});

export const { setFilters, setAccountFilter, setDateRangeFilter, rollDate, clearFilters } = tradesSlice.actions;
export default tradesSlice.reducer;
