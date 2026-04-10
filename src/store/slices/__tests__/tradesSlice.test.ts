import { describe, it, expect, beforeEach } from 'vitest';
import tradesReducer, {
  setFilters,
  setAccountFilter,
  setDateRangeFilter,
  clearFilters,
  type TradesState,
} from '../tradesSlice';

describe('tradesSlice', () => {
  // Get a fresh initial state from the reducer
  const getInitialState = (): TradesState => tradesReducer(undefined, { type: '@@INIT' });

  describe('initial state', () => {
    it('has the correct shape', () => {
      const state = getInitialState();
      expect(state).toHaveProperty('filters');
      expect(state.filters).toHaveProperty('accountId');
      expect(state.filters).toHaveProperty('startDate');
      expect(state.filters).toHaveProperty('endDate');
      expect(state.filters).toHaveProperty('datePreset');
    });

    it('defaults accountId to ALL', () => {
      const state = getInitialState();
      expect(state.filters.accountId).toBe('ALL');
    });

    it('defaults datePreset to thisWeek', () => {
      const state = getInitialState();
      expect(state.filters.datePreset).toBe('thisWeek');
    });

    it('has valid date strings for startDate and endDate', () => {
      const state = getInitialState();
      // Should be YYYY-MM-DD format
      expect(state.filters.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(state.filters.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('startDate is before or equal to endDate', () => {
      const state = getInitialState();
      expect(state.filters.startDate <= state.filters.endDate).toBe(true);
    });
  });

  describe('setFilters', () => {
    it('merges partial filter updates', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, setFilters({ accountId: 'acc-1' }));
      expect(state.filters.accountId).toBe('acc-1');
      // Other filters should be preserved
      expect(state.filters.datePreset).toBe(initial.filters.datePreset);
      expect(state.filters.startDate).toBe(initial.filters.startDate);
    });

    it('can update multiple filters at once', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, setFilters({
        accountId: 'acc-2',
        datePreset: 'thisMonth' as const,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      }));
      expect(state.filters.accountId).toBe('acc-2');
      expect(state.filters.datePreset).toBe('thisMonth');
      expect(state.filters.startDate).toBe('2025-01-01');
      expect(state.filters.endDate).toBe('2025-01-31');
    });

    it('overwrites existing filter values', () => {
      let state = getInitialState();
      state = tradesReducer(state, setFilters({ accountId: 'first' }));
      state = tradesReducer(state, setFilters({ accountId: 'second' }));
      expect(state.filters.accountId).toBe('second');
    });
  });

  describe('setAccountFilter', () => {
    it('sets the accountId', () => {
      const state = tradesReducer(getInitialState(), setAccountFilter('account-123'));
      expect(state.filters.accountId).toBe('account-123');
    });

    it('defaults to ALL when given falsy value (empty string)', () => {
      const state = tradesReducer(getInitialState(), setAccountFilter(''));
      expect(state.filters.accountId).toBe('ALL');
    });

    it('defaults to ALL when given null', () => {
      const state = tradesReducer(getInitialState(), setAccountFilter(null));
      expect(state.filters.accountId).toBe('ALL');
    });

    it('defaults to ALL when given undefined', () => {
      const state = tradesReducer(getInitialState(), setAccountFilter(undefined));
      expect(state.filters.accountId).toBe('ALL');
    });

    it('does not affect other filter properties', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, setAccountFilter('acc-1'));
      expect(state.filters.startDate).toBe(initial.filters.startDate);
      expect(state.filters.endDate).toBe(initial.filters.endDate);
      expect(state.filters.datePreset).toBe(initial.filters.datePreset);
    });
  });

  describe('setDateRangeFilter', () => {
    it('sets startDate and endDate', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      }));
      expect(state.filters.startDate).toBe('2025-03-01');
      expect(state.filters.endDate).toBe('2025-03-31');
    });

    it('sets datePreset when provided', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        datePreset: 'custom',
      }));
      expect(state.filters.datePreset).toBe('custom');
    });

    it('does not change datePreset when not provided in payload', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, setDateRangeFilter({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
      }));
      expect(state.filters.datePreset).toBe(initial.filters.datePreset);
    });

    it('does not change datePreset when datePreset is undefined in payload', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, setDateRangeFilter({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        datePreset: undefined,
      }));
      // datePreset is undefined, so the condition `action.payload.datePreset !== undefined` is false
      expect(state.filters.datePreset).toBe(initial.filters.datePreset);
    });

    it('does not affect accountId', () => {
      let state = tradesReducer(getInitialState(), setAccountFilter('acc-1'));
      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        datePreset: 'all',
      }));
      expect(state.filters.accountId).toBe('acc-1');
    });

    it('handles various datePreset values', () => {
      const presets = ['thisWeek', 'thisMonth', 'custom', 'all'] as const;
      for (const preset of presets) {
        const state = tradesReducer(getInitialState(), setDateRangeFilter({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          datePreset: preset,
        }));
        expect(state.filters.datePreset).toBe(preset);
      }
    });

    it('handles numeric datePreset values', () => {
      const numericPresets = [7, 30, 60, 90, 365] as const;
      for (const preset of numericPresets) {
        const state = tradesReducer(getInitialState(), setDateRangeFilter({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          datePreset: preset,
        }));
        expect(state.filters.datePreset).toBe(preset);
      }
    });
  });

  describe('clearFilters', () => {
    it('resets filters to default values', () => {
      let state = tradesReducer(getInitialState(), setFilters({
        accountId: 'acc-123',
        datePreset: 'custom' as const,
        startDate: '2020-01-01',
        endDate: '2020-12-31',
      }));

      state = tradesReducer(state, clearFilters());
      expect(state.filters.accountId).toBe('ALL');
      expect(state.filters.datePreset).toBe('thisWeek');
      expect(state.filters.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(state.filters.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('resets accountId to ALL', () => {
      let state = tradesReducer(getInitialState(), setAccountFilter('specific-account'));
      state = tradesReducer(state, clearFilters());
      expect(state.filters.accountId).toBe('ALL');
    });

    it('resets datePreset to thisWeek', () => {
      let state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        datePreset: 365,
      }));
      state = tradesReducer(state, clearFilters());
      expect(state.filters.datePreset).toBe('thisWeek');
    });
  });

  describe('unknown actions', () => {
    it('returns current state for unknown actions', () => {
      const initial = getInitialState();
      const state = tradesReducer(initial, { type: 'UNKNOWN_ACTION' });
      expect(state).toEqual(initial);
    });
  });

  describe('state transitions', () => {
    it('handles a complex filter workflow', () => {
      let state = getInitialState();

      // Select an account
      state = tradesReducer(state, setAccountFilter('acc-1'));
      expect(state.filters.accountId).toBe('acc-1');

      // Change date range
      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        datePreset: 'thisMonth',
      }));
      expect(state.filters.accountId).toBe('acc-1');
      expect(state.filters.datePreset).toBe('thisMonth');

      // Clear filters
      state = tradesReducer(state, clearFilters());
      expect(state.filters.accountId).toBe('ALL');
      expect(state.filters.datePreset).toBe('thisWeek');
    });
  });

  describe('setDateRangeFilter with all preset types', () => {
    it('sets datePreset to thisWeek', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-04-07',
        endDate: '2025-04-13',
        datePreset: 'thisWeek',
      }));
      expect(state.filters.datePreset).toBe('thisWeek');
      expect(state.filters.startDate).toBe('2025-04-07');
      expect(state.filters.endDate).toBe('2025-04-13');
    });

    it('sets datePreset to thisMonth', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        datePreset: 'thisMonth',
      }));
      expect(state.filters.datePreset).toBe('thisMonth');
      expect(state.filters.startDate).toBe('2025-04-01');
      expect(state.filters.endDate).toBe('2025-04-30');
    });

    it('sets datePreset to custom', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-02-15',
        endDate: '2025-03-20',
        datePreset: 'custom',
      }));
      expect(state.filters.datePreset).toBe('custom');
    });

    it('sets datePreset to all', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2020-01-01',
        endDate: '2025-12-31',
        datePreset: 'all',
      }));
      expect(state.filters.datePreset).toBe('all');
    });

    it('sets numeric datePreset 7 (last 7 days)', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-04-02',
        endDate: '2025-04-09',
        datePreset: 7,
      }));
      expect(state.filters.datePreset).toBe(7);
    });

    it('sets numeric datePreset 30 (last 30 days)', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-03-10',
        endDate: '2025-04-09',
        datePreset: 30,
      }));
      expect(state.filters.datePreset).toBe(30);
    });

    it('sets numeric datePreset 90 (last 90 days)', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-01-09',
        endDate: '2025-04-09',
        datePreset: 90,
      }));
      expect(state.filters.datePreset).toBe(90);
    });

    it('sets numeric datePreset 365 (last year)', () => {
      const state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2024-04-10',
        endDate: '2025-04-09',
        datePreset: 365,
      }));
      expect(state.filters.datePreset).toBe(365);
    });
  });

  describe('setAccountFilter with null (clear)', () => {
    it('resets accountId to ALL when given null', () => {
      let state = tradesReducer(getInitialState(), setAccountFilter('specific-account'));
      expect(state.filters.accountId).toBe('specific-account');

      state = tradesReducer(state, setAccountFilter(null));
      expect(state.filters.accountId).toBe('ALL');
    });

    it('does not affect date filters when clearing account filter with null', () => {
      let state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        datePreset: 'custom',
      }));
      state = tradesReducer(state, setAccountFilter('acc-1'));
      state = tradesReducer(state, setAccountFilter(null));
      expect(state.filters.accountId).toBe('ALL');
      expect(state.filters.startDate).toBe('2025-01-01');
      expect(state.filters.endDate).toBe('2025-06-30');
      expect(state.filters.datePreset).toBe('custom');
    });
  });

  describe('concurrent filter updates', () => {
    it('handles sequential account and date range updates correctly', () => {
      let state = getInitialState();
      state = tradesReducer(state, setAccountFilter('acc-1'));
      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        datePreset: 30,
      }));
      state = tradesReducer(state, setAccountFilter('acc-2'));
      expect(state.filters.accountId).toBe('acc-2');
      expect(state.filters.startDate).toBe('2025-01-01');
      expect(state.filters.endDate).toBe('2025-01-31');
      expect(state.filters.datePreset).toBe(30);
    });

    it('setFilters overrides individual setAccountFilter and setDateRangeFilter', () => {
      let state = getInitialState();
      state = tradesReducer(state, setAccountFilter('acc-1'));
      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        datePreset: 'thisMonth',
      }));
      state = tradesReducer(state, setFilters({
        accountId: 'acc-override',
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        datePreset: 'custom' as const,
      }));
      expect(state.filters.accountId).toBe('acc-override');
      expect(state.filters.startDate).toBe('2025-06-01');
      expect(state.filters.endDate).toBe('2025-06-30');
      expect(state.filters.datePreset).toBe('custom');
    });
  });

  describe('initial state correctness', () => {
    it('initial state filters object has exactly four keys', () => {
      const state = getInitialState();
      expect(Object.keys(state.filters)).toHaveLength(4);
      expect(Object.keys(state.filters).sort()).toEqual(
        ['accountId', 'datePreset', 'endDate', 'startDate']
      );
    });

    it('initial state is a fresh object on every call to reducer with undefined', () => {
      const state1 = tradesReducer(undefined, { type: '@@INIT' });
      const state2 = tradesReducer(undefined, { type: '@@INIT' });
      expect(state1).toEqual(state2);
    });
  });

  describe('filters persist across date changes', () => {
    it('accountId persists when date range is updated', () => {
      let state = tradesReducer(getInitialState(), setAccountFilter('persistent-acc'));
      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        datePreset: 30,
      }));
      expect(state.filters.accountId).toBe('persistent-acc');

      state = tradesReducer(state, setDateRangeFilter({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        datePreset: 'thisMonth',
      }));
      expect(state.filters.accountId).toBe('persistent-acc');
    });

    it('datePreset persists when account filter is changed', () => {
      let state = tradesReducer(getInitialState(), setDateRangeFilter({
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        datePreset: 'custom',
      }));
      state = tradesReducer(state, setAccountFilter('new-acc'));
      expect(state.filters.datePreset).toBe('custom');
      expect(state.filters.startDate).toBe('2025-03-01');
      expect(state.filters.endDate).toBe('2025-03-31');
    });

    it('multiple date range changes preserve accountId throughout', () => {
      let state = tradesReducer(getInitialState(), setAccountFilter('sticky-account'));
      const dateRanges = [
        { startDate: '2025-01-01', endDate: '2025-01-31', datePreset: 30 as const },
        { startDate: '2025-02-01', endDate: '2025-02-28', datePreset: 'custom' as const },
        { startDate: '2025-03-01', endDate: '2025-03-31', datePreset: 'thisMonth' as const },
      ];
      for (const range of dateRanges) {
        state = tradesReducer(state, setDateRangeFilter(range));
        expect(state.filters.accountId).toBe('sticky-account');
      }
    });
  });
});
