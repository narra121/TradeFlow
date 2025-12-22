import { useState, useCallback, useEffect } from 'react';
import { SavedOptions } from '@/types/trade';

// Storage key for persisting options
const STORAGE_KEY = 'tradingJournal_savedOptions';

// Default options - in production these would come from a database
const defaultOptions: SavedOptions = {
  symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'NAS100', 'US30', 'BTC/USD', 'ETH/USD'],
  strategies: ['Breakout', 'Support Bounce', 'Resistance Rejection', 'Trend Continuation', 'Range Trade', 'News Trade'],
  sessions: ['Asian', 'London Open', 'London Close', 'NY Open', 'NY PM', 'London/NY Overlap'],
  marketConditions: ['Trending', 'Ranging', 'Choppy', 'High Volatility', 'Low Volatility', 'Consolidation'],
  newsEvents: ['NFP Release', 'FOMC Meeting', 'CPI Data', 'GDP Report', 'Interest Rate Decision', 'Employment Data'],
  mistakes: ['FOMO', 'Early Entry', 'Late Entry', 'Early Exit', 'Moved Stop Loss', 'Wrong Position Size', 'Revenge Trade', 'Overtrading', 'No Stop Loss'],
  lessons: ['Wait for candle close', 'Stick to the plan', 'Reduce position size', 'Take partials', 'Trust the setup', 'Be patient'],
  timeframes: ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly'],
};

// Load options from localStorage
function loadOptions(): SavedOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultOptions, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load saved options:', e);
  }
  return defaultOptions;
}

// Save options to localStorage
function saveOptions(options: SavedOptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch (e) {
    console.error('Failed to save options:', e);
  }
}

export function useSavedOptions() {
  const [options, setOptions] = useState<SavedOptions>(loadOptions);

  // Persist options when they change
  useEffect(() => {
    saveOptions(options);
  }, [options]);

  const addSymbol = useCallback((symbol: string) => {
    setOptions((prev) => ({
      ...prev,
      symbols: [...prev.symbols, symbol],
    }));
  }, []);

  const removeSymbol = useCallback((symbol: string) => {
    setOptions((prev) => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== symbol),
    }));
  }, []);

  const addStrategy = useCallback((strategy: string) => {
    setOptions((prev) => ({
      ...prev,
      strategies: [...prev.strategies, strategy],
    }));
  }, []);

  const removeStrategy = useCallback((strategy: string) => {
    setOptions((prev) => ({
      ...prev,
      strategies: prev.strategies.filter(s => s !== strategy),
    }));
  }, []);

  const addSession = useCallback((session: string) => {
    setOptions((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
    }));
  }, []);

  const removeSession = useCallback((session: string) => {
    setOptions((prev) => ({
      ...prev,
      sessions: prev.sessions.filter(s => s !== session),
    }));
  }, []);

  const addMarketCondition = useCallback((condition: string) => {
    setOptions((prev) => ({
      ...prev,
      marketConditions: [...prev.marketConditions, condition],
    }));
  }, []);

  const removeMarketCondition = useCallback((condition: string) => {
    setOptions((prev) => ({
      ...prev,
      marketConditions: prev.marketConditions.filter(c => c !== condition),
    }));
  }, []);

  const addNewsEvent = useCallback((event: string) => {
    setOptions((prev) => ({
      ...prev,
      newsEvents: [...prev.newsEvents, event],
    }));
  }, []);

  const removeNewsEvent = useCallback((event: string) => {
    setOptions((prev) => ({
      ...prev,
      newsEvents: prev.newsEvents.filter(e => e !== event),
    }));
  }, []);

  const addMistake = useCallback((mistake: string) => {
    setOptions((prev) => ({
      ...prev,
      mistakes: [...prev.mistakes, mistake],
    }));
  }, []);

  const removeMistake = useCallback((mistake: string) => {
    setOptions((prev) => ({
      ...prev,
      mistakes: prev.mistakes.filter(m => m !== mistake),
    }));
  }, []);

  const addLesson = useCallback((lesson: string) => {
    setOptions((prev) => ({
      ...prev,
      lessons: [...prev.lessons, lesson],
    }));
  }, []);

  const removeLesson = useCallback((lesson: string) => {
    setOptions((prev) => ({
      ...prev,
      lessons: prev.lessons.filter(l => l !== lesson),
    }));
  }, []);

  const addTimeframe = useCallback((timeframe: string) => {
    setOptions((prev) => ({
      ...prev,
      timeframes: [...prev.timeframes, timeframe],
    }));
  }, []);

  const removeTimeframe = useCallback((timeframe: string) => {
    setOptions((prev) => ({
      ...prev,
      timeframes: prev.timeframes.filter(t => t !== timeframe),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setOptions(defaultOptions);
  }, []);

  return {
    options,
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
