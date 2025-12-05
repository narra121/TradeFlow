import { useState, useCallback } from 'react';
import { SavedOptions } from '@/types/trade';

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

export function useSavedOptions() {
  const [options, setOptions] = useState<SavedOptions>(defaultOptions);

  const addSymbol = useCallback((symbol: string) => {
    setOptions((prev) => ({
      ...prev,
      symbols: [...prev.symbols, symbol],
    }));
  }, []);

  const addStrategy = useCallback((strategy: string) => {
    setOptions((prev) => ({
      ...prev,
      strategies: [...prev.strategies, strategy],
    }));
  }, []);

  const addSession = useCallback((session: string) => {
    setOptions((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
    }));
  }, []);

  const addMarketCondition = useCallback((condition: string) => {
    setOptions((prev) => ({
      ...prev,
      marketConditions: [...prev.marketConditions, condition],
    }));
  }, []);

  const addNewsEvent = useCallback((event: string) => {
    setOptions((prev) => ({
      ...prev,
      newsEvents: [...prev.newsEvents, event],
    }));
  }, []);

  const addMistake = useCallback((mistake: string) => {
    setOptions((prev) => ({
      ...prev,
      mistakes: [...prev.mistakes, mistake],
    }));
  }, []);

  const addLesson = useCallback((lesson: string) => {
    setOptions((prev) => ({
      ...prev,
      lessons: [...prev.lessons, lesson],
    }));
  }, []);

  const addTimeframe = useCallback((timeframe: string) => {
    setOptions((prev) => ({
      ...prev,
      timeframes: [...prev.timeframes, timeframe],
    }));
  }, []);

  return {
    options,
    addSymbol,
    addStrategy,
    addSession,
    addMarketCondition,
    addNewsEvent,
    addMistake,
    addLesson,
    addTimeframe,
  };
}
