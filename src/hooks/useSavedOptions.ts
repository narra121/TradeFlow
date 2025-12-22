import { useCallback, useMemo } from 'react';
import { useGetSavedOptionsQuery, useUpdateSavedOptionsMutation, SavedOptions } from '@/store/api';

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
  const { data: apiOptions, isLoading } = useGetSavedOptionsQuery();
  const [updateOptions] = useUpdateSavedOptionsMutation();

  const options = useMemo(() => apiOptions || defaultOptions, [apiOptions]);

  const updateWithNewOptions = useCallback(
    (updater: (prev: SavedOptions) => SavedOptions) => {
      const newOptions = updater(options);
      updateOptions(newOptions);
    },
    [options, updateOptions]
  );

  const addSymbol = useCallback((symbol: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      symbols: [...prev.symbols, symbol],
    }));
  }, [updateWithNewOptions]);

  const removeSymbol = useCallback((symbol: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== symbol),
    }));
  }, [updateWithNewOptions]);

  const addStrategy = useCallback((strategy: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      strategies: [...prev.strategies, strategy],
    }));
  }, [updateWithNewOptions]);

  const removeStrategy = useCallback((strategy: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      strategies: prev.strategies.filter(s => s !== strategy),
    }));
  }, [updateWithNewOptions]);

  const addSession = useCallback((session: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
    }));
  }, [updateWithNewOptions]);

  const removeSession = useCallback((session: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      sessions: prev.sessions.filter(s => s !== session),
    }));
  }, [updateWithNewOptions]);

  const addMarketCondition = useCallback((condition: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      marketConditions: [...prev.marketConditions, condition],
    }));
  }, [updateWithNewOptions]);

  const removeMarketCondition = useCallback((condition: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      marketConditions: prev.marketConditions.filter(c => c !== condition),
    }));
  }, [updateWithNewOptions]);

  const addNewsEvent = useCallback((event: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      newsEvents: [...prev.newsEvents, event],
    }));
  }, [updateWithNewOptions]);

  const removeNewsEvent = useCallback((event: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      newsEvents: prev.newsEvents.filter(e => e !== event),
    }));
  }, [updateWithNewOptions]);

  const addMistake = useCallback((mistake: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      mistakes: [...prev.mistakes, mistake],
    }));
  }, [updateWithNewOptions]);

  const removeMistake = useCallback((mistake: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      mistakes: prev.mistakes.filter(m => m !== mistake),
    }));
  }, [updateWithNewOptions]);

  const addLesson = useCallback((lesson: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      lessons: [...prev.lessons, lesson],
    }));
  }, [updateWithNewOptions]);

  const removeLesson = useCallback((lesson: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      lessons: prev.lessons.filter(l => l !== lesson),
    }));
  }, [updateWithNewOptions]);

  const addTimeframe = useCallback((timeframe: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      timeframes: [...prev.timeframes, timeframe],
    }));
  }, [updateWithNewOptions]);

  const removeTimeframe = useCallback((timeframe: string) => {
    updateWithNewOptions((prev) => ({
      ...prev,
      timeframes: prev.timeframes.filter(t => t !== timeframe),
    }));
  }, [updateWithNewOptions]);

  const resetToDefaults = useCallback(() => {
    updateOptions(defaultOptions);
  }, [updateOptions]);

  return {
    options,
    isLoading,
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

