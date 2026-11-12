import { useMemo } from 'react';
import { useGetRulesQuery } from '@/store/api';

export function useTradingRules() {
  const { data: rules = [], isLoading: loading } = useGetRulesQuery();

  const uniqueRules = useMemo(
    () => rules.filter((rule, i, arr) => arr.findIndex(r => r.rule === rule.rule) === i),
    [rules]
  );

  return {
    rules: uniqueRules,
    /** Every stored rule, one per period; trades reference these ids. */
    allRules: rules,
    loading,
  };
}
