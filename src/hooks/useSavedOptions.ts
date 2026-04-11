import { useCallback, useMemo } from 'react';
import { useGetSavedOptionsQuery, useUpdateSavedOptionsMutation } from '@/store/api';
import type { SavedOptions } from '@/store/api';
import { toast } from 'sonner';

// Default options - used as fallback
const defaultOptions: SavedOptions = {
  symbols: [],
  strategies: ['Breakout', 'Support Bounce', 'Resistance Rejection', 'Trend Continuation', 'Range Trade', 'News Trade'],
  sessions: ['Asian', 'London Open', 'London Close', 'NY Open', 'NY PM', 'London/NY Overlap'],
  marketConditions: ['Trending', 'Ranging', 'Choppy', 'High Volatility', 'Low Volatility', 'Consolidation'],
  newsEvents: ['NFP Release', 'FOMC Meeting', 'CPI Data', 'GDP Report', 'Interest Rate Decision', 'Employment Data'],
  mistakes: ['FOMO', 'Early Entry', 'Late Entry', 'Early Exit', 'Moved Stop Loss', 'Wrong Position Size', 'Revenge Trade', 'Overtrading', 'No Stop Loss'],
  lessons: [],
  timeframes: [],
};

export function useSavedOptions() {
  const { data: apiOptions, isLoading: queryLoading, isFetching } = useGetSavedOptionsQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const [updateOptions, { isLoading: isUpdating }] = useUpdateSavedOptionsMutation();

  const options = useMemo(() => apiOptions || defaultOptions, [apiOptions]);

  const updateWithNewOptions = useCallback(
    (updater: (prev: SavedOptions) => SavedOptions) => {
      const newOptions = updater(options);
      updateOptions(newOptions);
    },
    [options, updateOptions]
  );

  const addToCategory = useCallback(
    (category: keyof SavedOptions, value: string, label: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        toast.warning(`${label} cannot be empty`);
        return;
      }
      const existing = options[category] as string[];
      if (existing.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
        toast.warning(`"${trimmed}" already exists in ${label.toLowerCase()}s`);
        return;
      }
      updateWithNewOptions((prev) => ({
        ...prev,
        [category]: [...(prev[category] as string[]), trimmed],
      }));
    },
    [options, updateWithNewOptions]
  );

  const removeFromCategory = useCallback(
    (category: keyof SavedOptions, value: string) => {
      updateWithNewOptions((prev) => ({
        ...prev,
        [category]: (prev[category] as string[]).filter(v => v !== value),
      }));
    },
    [updateWithNewOptions]
  );

  const addSymbol = useCallback((s: string) => addToCategory('symbols', s, 'Symbol'), [addToCategory]);
  const removeSymbol = useCallback((s: string) => removeFromCategory('symbols', s), [removeFromCategory]);
  const addStrategy = useCallback((s: string) => addToCategory('strategies', s, 'Strategy'), [addToCategory]);
  const removeStrategy = useCallback((s: string) => removeFromCategory('strategies', s), [removeFromCategory]);
  const addSession = useCallback((s: string) => addToCategory('sessions', s, 'Session'), [addToCategory]);
  const removeSession = useCallback((s: string) => removeFromCategory('sessions', s), [removeFromCategory]);
  const addMarketCondition = useCallback((s: string) => addToCategory('marketConditions', s, 'Market condition'), [addToCategory]);
  const removeMarketCondition = useCallback((s: string) => removeFromCategory('marketConditions', s), [removeFromCategory]);
  const addNewsEvent = useCallback((s: string) => addToCategory('newsEvents', s, 'News event'), [addToCategory]);
  const removeNewsEvent = useCallback((s: string) => removeFromCategory('newsEvents', s), [removeFromCategory]);
  const addMistake = useCallback((s: string) => addToCategory('mistakes', s, 'Mistake'), [addToCategory]);
  const removeMistake = useCallback((s: string) => removeFromCategory('mistakes', s), [removeFromCategory]);
  const addLesson = useCallback((s: string) => addToCategory('lessons', s, 'Lesson'), [addToCategory]);
  const removeLesson = useCallback((s: string) => removeFromCategory('lessons', s), [removeFromCategory]);
  const addTimeframe = useCallback((s: string) => addToCategory('timeframes', s, 'Timeframe'), [addToCategory]);
  const removeTimeframe = useCallback((s: string) => removeFromCategory('timeframes', s), [removeFromCategory]);

  const resetToDefaults = useCallback(() => {
    updateOptions(defaultOptions);
  }, [updateOptions]);

  const isLoading = queryLoading || isFetching || isUpdating;

  return {
    options,
    isLoading,
    isUpdating,
    addSymbol,
    removeSymbol,
    addStrategy,
    removeStrategy,
    addSession,
    removeSession,
    addMarketCondition,
    removeMarketCondition,
    addNewsEvent,
    removeNewsEvent,
    addMistake,
    removeMistake,
    addLesson,
    removeLesson,
    addTimeframe,
    removeTimeframe,
    resetToDefaults,
  };
}

