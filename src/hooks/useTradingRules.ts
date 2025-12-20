import { useGetRulesQuery } from '@/store/api';

export function useTradingRules() {
  const { data: rules = [], isLoading: loading } = useGetRulesQuery();

  return {
    rules,
    loading,
  };
}
