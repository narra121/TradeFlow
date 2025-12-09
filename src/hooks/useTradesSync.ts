import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTrades, setAccountFilter } from '@/store/slices/tradesSlice';

/**
 * Hook to sync trades with account selection
 * Call this in your main app component
 */
export function useTradesSync() {
  const dispatch = useAppDispatch();
  const { selectedAccountId } = useAppSelector((state) => state.accounts);
  const { filters } = useAppSelector((state) => state.trades);

  // Sync account filter when selectedAccountId changes
  useEffect(() => {
    dispatch(setAccountFilter(selectedAccountId || 'ALL'));
  }, [dispatch, selectedAccountId]);

  // Fetch trades when filters change
  useEffect(() => {
    if (filters.accountId && filters.startDate && filters.endDate) {
      dispatch(fetchTrades());
    }
  }, [dispatch, filters.accountId, filters.startDate, filters.endDate]);
}
