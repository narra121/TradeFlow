import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchRules } from '@/store/slices/goalsRulesSlice';

export function useTradingRules() {
  const dispatch = useAppDispatch();
  const { rules, loading, error } = useAppSelector((state) => state.goalsRules);
  const hasFetchedRef = useRef(false);

  // Fetch rules only once on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(fetchRules());
    }
  }, [dispatch]);

  return {
    rules,
    loading,
  };
}
