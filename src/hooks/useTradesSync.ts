import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { rollDate, setAccountFilter } from '@/store/slices/tradesSlice';

/** Mirrors the account scope into the trades filters and keeps relative date presets current across midnight. */
export function useTradesSync() {
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector((state) => state.accounts.selectedAccountId);

  useEffect(() => {
    dispatch(setAccountFilter(selectedAccountId || 'ALL'));
  }, [dispatch, selectedAccountId]);

  useEffect(() => {
    const roll = () => dispatch(rollDate());
    const onVisible = () => {
      if (document.visibilityState === 'visible') roll();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(roll, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [dispatch]);
}
