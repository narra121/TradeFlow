import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchRules } from '@/store/slices/goalsRulesSlice';

export function useTradingRules() {
  const dispatch = useAppDispatch();
  const { rules, loading } = useAppSelector((state) => state.goalsRules);

  // Fetch rules on mount if not already loaded
  useEffect(() => {
    if (rules.length === 0 && !loading) {
      dispatch(fetchRules());
    }
  }, [dispatch, rules.length, loading]);

  return {
    rules,
    loading,
  };
}
