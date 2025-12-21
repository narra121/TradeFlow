import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAccountFilter } from '@/store/slices/tradesSlice';

/**
 * Hook to sync trades with account selection
 * Call this in your main app component
 * RTK Query will automatically refetch when filters change
 */
export function useTradesSync() {
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.accounts.selectedAccountId);

  // Sync account filter when selectedAccountId changes
  useEffect(() => {
    dispatch(setAccountFilter(selectedAccountId || 'ALL'));
  }, [dispatch, selectedAccountId]);
}
