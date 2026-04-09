import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedOptions } from '../useSavedOptions';

// Mock RTK Query hooks
const mockUseGetSavedOptionsQuery = vi.fn();
const mockUpdateOptions = vi.fn();

vi.mock('@/store/api', () => ({
  useGetSavedOptionsQuery: (...args: any[]) => mockUseGetSavedOptionsQuery(...args),
  useUpdateSavedOptionsMutation: () => [mockUpdateOptions, { isLoading: false }],
}));

const defaultOptions = {
  symbols: [],
  strategies: ['Breakout', 'Support Bounce', 'Resistance Rejection', 'Trend Continuation', 'Range Trade', 'News Trade'],
  sessions: ['Asian', 'London Open', 'London Close', 'NY Open', 'NY PM', 'London/NY Overlap'],
  marketConditions: ['Trending', 'Ranging', 'Choppy', 'High Volatility', 'Low Volatility', 'Consolidation'],
  newsEvents: ['NFP Release', 'FOMC Meeting', 'CPI Data', 'GDP Report', 'Interest Rate Decision', 'Employment Data'],
  mistakes: ['FOMO', 'Early Entry', 'Late Entry', 'Early Exit', 'Moved Stop Loss', 'Wrong Position Size', 'Revenge Trade', 'Overtrading', 'No Stop Loss'],
  lessons: [],
  timeframes: [],
};

const customOptions = {
  symbols: ['EURUSD', 'GBPUSD'],
  strategies: ['Breakout', 'Scalping'],
  sessions: ['London Open', 'NY Open'],
  marketConditions: ['Trending'],
  newsEvents: ['NFP Release'],
  mistakes: ['FOMO'],
  lessons: ['Always use stops'],
  timeframes: ['1H', '4H'],
};

describe('useSavedOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });
  });

  it('returns default options when API returns no data', () => {
    const { result } = renderHook(() => useSavedOptions());

    expect(result.current.options).toEqual(defaultOptions);
  });

  it('returns API data when available', () => {
    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: customOptions,
      isLoading: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useSavedOptions());

    expect(result.current.options).toEqual(customOptions);
  });

  it('returns isLoading true when query is loading', () => {
    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
    });

    const { result } = renderHook(() => useSavedOptions());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading true when fetching', () => {
    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: customOptions,
      isLoading: false,
      isFetching: true,
    });

    const { result } = renderHook(() => useSavedOptions());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns isLoading false when not loading or fetching', () => {
    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: customOptions,
      isLoading: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useSavedOptions());

    expect(result.current.isLoading).toBe(false);
  });

  it('passes correct query options to useGetSavedOptionsQuery', () => {
    renderHook(() => useSavedOptions());

    expect(mockUseGetSavedOptionsQuery).toHaveBeenCalledWith(undefined, {
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });
  });

  describe('symbol methods', () => {
    it('addSymbol calls updateOptions with new symbol appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addSymbol('USDJPY');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['EURUSD', 'GBPUSD', 'USDJPY'],
        })
      );
    });

    it('removeSymbol calls updateOptions with symbol removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeSymbol('EURUSD');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['GBPUSD'],
        })
      );
    });
  });

  describe('strategy methods', () => {
    it('addStrategy calls updateOptions with new strategy appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addStrategy('Mean Reversion');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          strategies: ['Breakout', 'Scalping', 'Mean Reversion'],
        })
      );
    });

    it('removeStrategy calls updateOptions with strategy removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeStrategy('Scalping');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          strategies: ['Breakout'],
        })
      );
    });
  });

  describe('session methods', () => {
    it('addSession calls updateOptions with new session appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addSession('Asian');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          sessions: ['London Open', 'NY Open', 'Asian'],
        })
      );
    });

    it('removeSession calls updateOptions with session removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeSession('London Open');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          sessions: ['NY Open'],
        })
      );
    });
  });

  describe('marketCondition methods', () => {
    it('addMarketCondition calls updateOptions with new condition appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addMarketCondition('Ranging');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          marketConditions: ['Trending', 'Ranging'],
        })
      );
    });

    it('removeMarketCondition calls updateOptions with condition removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeMarketCondition('Trending');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          marketConditions: [],
        })
      );
    });
  });

  describe('newsEvent methods', () => {
    it('addNewsEvent calls updateOptions with new event appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addNewsEvent('FOMC Meeting');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          newsEvents: ['NFP Release', 'FOMC Meeting'],
        })
      );
    });

    it('removeNewsEvent calls updateOptions with event removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeNewsEvent('NFP Release');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          newsEvents: [],
        })
      );
    });
  });

  describe('mistake methods', () => {
    it('addMistake calls updateOptions with new mistake appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addMistake('Overtrading');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          mistakes: ['FOMO', 'Overtrading'],
        })
      );
    });

    it('removeMistake calls updateOptions with mistake removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeMistake('FOMO');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          mistakes: [],
        })
      );
    });
  });

  describe('lesson methods', () => {
    it('addLesson calls updateOptions with new lesson appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addLesson('Patience is key');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          lessons: ['Always use stops', 'Patience is key'],
        })
      );
    });

    it('removeLesson calls updateOptions with lesson removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeLesson('Always use stops');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          lessons: [],
        })
      );
    });
  });

  describe('timeframe methods', () => {
    it('addTimeframe calls updateOptions with new timeframe appended', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.addTimeframe('15M');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframes: ['1H', '4H', '15M'],
        })
      );
    });

    it('removeTimeframe calls updateOptions with timeframe removed', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.removeTimeframe('1H');
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframes: ['4H'],
        })
      );
    });
  });

  describe('resetToDefaults', () => {
    it('calls updateOptions with default options', () => {
      mockUseGetSavedOptionsQuery.mockReturnValue({
        data: customOptions,
        isLoading: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useSavedOptions());

      act(() => {
        result.current.resetToDefaults();
      });

      expect(mockUpdateOptions).toHaveBeenCalledWith(defaultOptions);
    });
  });

  it('exposes all required methods', () => {
    const { result } = renderHook(() => useSavedOptions());

    const expectedMethods = [
      'options', 'isLoading', 'isUpdating',
      'addSymbol', 'removeSymbol',
      'addStrategy', 'removeStrategy',
      'addSession', 'removeSession',
      'addMarketCondition', 'removeMarketCondition',
      'addNewsEvent', 'removeNewsEvent',
      'addMistake', 'removeMistake',
      'addLesson', 'removeLesson',
      'addTimeframe', 'removeTimeframe',
      'resetToDefaults',
    ];

    expectedMethods.forEach((method) => {
      expect(result.current).toHaveProperty(method);
    });
  });

  it('preserves other fields when updating a specific field', () => {
    mockUseGetSavedOptionsQuery.mockReturnValue({
      data: customOptions,
      isLoading: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useSavedOptions());

    act(() => {
      result.current.addSymbol('XAUUSD');
    });

    const updateCall = mockUpdateOptions.mock.calls[0][0];
    // Ensure all other fields remain unchanged
    expect(updateCall.strategies).toEqual(customOptions.strategies);
    expect(updateCall.sessions).toEqual(customOptions.sessions);
    expect(updateCall.marketConditions).toEqual(customOptions.marketConditions);
    expect(updateCall.newsEvents).toEqual(customOptions.newsEvents);
    expect(updateCall.mistakes).toEqual(customOptions.mistakes);
    expect(updateCall.lessons).toEqual(customOptions.lessons);
    expect(updateCall.timeframes).toEqual(customOptions.timeframes);
    // Only symbols should have changed
    expect(updateCall.symbols).toEqual(['EURUSD', 'GBPUSD', 'XAUUSD']);
  });
});
