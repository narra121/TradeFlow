import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseReport, useFirebaseChat } from '../useFirebaseAI';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';

// Mock firebase/ai module
const mockStreamReport = vi.fn();
const mockCreateChat = vi.fn();
const mockStreamChatMessage = vi.fn();

vi.mock('@/lib/firebase/ai', () => ({
  streamReport: (...args: any[]) => mockStreamReport(...args),
  createChat: (...args: any[]) => mockCreateChat(...args),
  streamChatMessage: (...args: any[]) => mockStreamChatMessage(...args),
}));

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150,
  exitPrice: 155,
  stopLoss: 148,
  takeProfit: 160,
  size: 100,
  entryDate: '2026-04-10T09:30:00Z',
  exitDate: '2026-04-10T15:00:00Z',
  outcome: 'TP',
  pnl: 500,
  riskRewardRatio: 2.5,
  ...overrides,
});

/**
 * Helper to create an async generator from an array of values.
 */
async function* asyncGen<T>(values: T[]): AsyncGenerator<T> {
  for (const value of values) {
    yield value;
  }
}

/**
 * Helper to create an async generator that throws after yielding some values.
 */
async function* asyncGenError<T>(values: T[], error: Error): AsyncGenerator<T> {
  for (const value of values) {
    yield value;
  }
  throw error;
}

describe('useFirebaseReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state with null data and streaming=false', () => {
    const { result } = renderHook(() => useFirebaseReport());

    expect(result.current.data).toBeNull();
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.generate).toBe('function');
    expect(typeof result.current.abort).toBe('function');
  });

  it('sets streaming=true when generate is called', async () => {
    // Create a generator that will never resolve (for testing streaming state)
    let resolveGen: (() => void) | undefined;
    const blockingPromise = new Promise<void>((resolve) => {
      resolveGen = resolve;
    });

    mockStreamReport.mockImplementation(async function* () {
      await blockingPromise;
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    expect(result.current.streaming).toBe(true);
    expect(result.current.data).toBeNull();

    // Cleanup
    resolveGen!();
  });

  it('progressively updates data as stream yields partial results', async () => {
    const partial1: Partial<InsightsResponse> = {
      profile: {
        type: 'day_trader',
        typeLabel: 'Day Trader',
        aggressivenessScore: 65,
        aggressivenessLabel: 'Medium',
        trend: 'improving',
        summary: 'Active day trader',
      },
    };

    const partial2: Partial<InsightsResponse> = {
      ...partial1,
      scores: [
        { dimension: 'Risk Management', value: 75, label: 'Good' },
      ],
    };

    const finalResult: Partial<InsightsResponse> = {
      ...partial2,
      summary: 'Complete analysis',
    };

    mockStreamReport.mockReturnValue(asyncGen([partial1, partial2, finalResult]));

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    // Final data should be set
    expect(result.current.data).toEqual(finalResult);
    expect(result.current.error).toBeNull();
  });

  it('sets error when stream throws', async () => {
    mockStreamReport.mockReturnValue(
      asyncGenError([], new Error('Firebase AI request failed')),
    );

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.error).toBe('Firebase AI request failed');
  });

  it('sets generic error message for non-Error throws', async () => {
    mockStreamReport.mockImplementation(async function* () {
      throw 'string error';
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.error).toBe('Report generation failed');
  });

  it('abort cancels the current stream', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveGen: (() => void) | undefined;
    const blockingPromise = new Promise<void>((resolve) => {
      resolveGen = resolve;
    });

    mockStreamReport.mockImplementation(async function* (_trades: Trade[], signal: AbortSignal) {
      capturedSignal = signal;
      await blockingPromise;
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    expect(result.current.streaming).toBe(true);

    act(() => {
      result.current.abort();
    });

    expect(result.current.streaming).toBe(false);
    expect(capturedSignal?.aborted).toBe(true);

    // Cleanup
    resolveGen!();
  });

  it('passes trades and AbortSignal to streamReport', async () => {
    mockStreamReport.mockReturnValue(asyncGen([]));

    const trades = [makeTrade({ id: 'trade-1' }), makeTrade({ id: 'trade-2' })];

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate(trades);
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(mockStreamReport).toHaveBeenCalledTimes(1);
    expect(mockStreamReport).toHaveBeenCalledWith(trades, expect.any(AbortSignal));
  });

  it('aborts previous stream when generate is called again', async () => {
    let firstSignal: AbortSignal | undefined;
    let secondSignal: AbortSignal | undefined;

    let callCount = 0;
    mockStreamReport.mockImplementation(async function* (_trades: Trade[], signal: AbortSignal) {
      callCount++;
      if (callCount === 1) {
        firstSignal = signal;
      } else {
        secondSignal = signal;
      }
      // Yield empty to complete
    });

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade({ id: 'trade-1' })]);
    });

    act(() => {
      result.current.generate([makeTrade({ id: 'trade-2' })]);
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal?.aborted).toBe(false);
  });

  it('clears previous data and error when generate is called', async () => {
    // First call: succeed
    mockStreamReport.mockReturnValueOnce(
      asyncGen([{ summary: 'First report' } as Partial<InsightsResponse>]),
    );

    const { result } = renderHook(() => useFirebaseReport());

    act(() => {
      result.current.generate([makeTrade()]);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ summary: 'First report' });
    });

    // Second call: will clear data
    mockStreamReport.mockReturnValueOnce(asyncGen([]));

    act(() => {
      result.current.generate([makeTrade()]);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useFirebaseChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateChat.mockReturnValue({ sendMessageStream: vi.fn() });
  });

  it('returns initial state with empty messages and streaming=false', () => {
    const { result } = renderHook(() => useFirebaseChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.abort).toBe('function');
  });

  it('appends user message immediately when send is called', async () => {
    mockStreamChatMessage.mockReturnValue(asyncGen(['Hello', ' there!']));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('What is my win rate?', 'trade context');
    });

    // User message should be added immediately
    expect(result.current.messages[0]).toEqual({
      role: 'user',
      text: 'What is my win rate?',
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });
  });

  it('progressively updates model response as stream yields chunks', async () => {
    mockStreamChatMessage.mockReturnValue(asyncGen(['Your ', 'win rate ', 'is 65%.']));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('What is my win rate?');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: 'user', text: 'What is my win rate?' });
    expect(result.current.messages[1]).toEqual({ role: 'model', text: 'Your win rate is 65%.' });
  });

  it('sets error when chat stream throws', async () => {
    mockStreamChatMessage.mockReturnValue(
      asyncGenError([], new Error('Firebase AI chat request failed')),
    );

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.error).toBe('Firebase AI chat request failed');
    // User message should still be present
    expect(result.current.messages[0]).toEqual({ role: 'user', text: 'Hello' });
  });

  it('removes empty model placeholder on error', async () => {
    mockStreamChatMessage.mockReturnValue(
      asyncGenError([], new Error('Failed')),
    );

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    // Should have user message but no empty model message
    const modelMessages = result.current.messages.filter((m) => m.role === 'model');
    const emptyModelMessages = modelMessages.filter((m) => !m.text);
    expect(emptyModelMessages).toHaveLength(0);
  });

  it('abort cancels the current chat stream', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveGen: (() => void) | undefined;
    const blockingPromise = new Promise<void>((resolve) => {
      resolveGen = resolve;
    });

    mockStreamChatMessage.mockImplementation(async function* (
      _chat: any,
      _message: string,
      signal: AbortSignal,
    ) {
      capturedSignal = signal;
      await blockingPromise;
    });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    expect(result.current.streaming).toBe(true);

    act(() => {
      result.current.abort();
    });

    expect(result.current.streaming).toBe(false);
    expect(capturedSignal?.aborted).toBe(true);

    // Cleanup
    resolveGen!();
  });

  it('creates chat session with context on first send', async () => {
    mockStreamChatMessage.mockReturnValue(asyncGen(['response']));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Analyze my risk', 'Summary: 100 trades, 65% win rate');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(mockCreateChat).toHaveBeenCalledWith('Summary: 100 trades, 65% win rate');
  });

  it('defaults context to empty string when not provided', async () => {
    mockStreamChatMessage.mockReturnValue(asyncGen(['response']));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(mockCreateChat).toHaveBeenCalledWith('');
  });

  it('maintains conversation history across multiple sends', async () => {
    mockStreamChatMessage
      .mockReturnValueOnce(asyncGen(['First response']))
      .mockReturnValueOnce(asyncGen(['Second response']));

    const { result } = renderHook(() => useFirebaseChat());

    // First message
    act(() => {
      result.current.send('First question');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    // Second message
    act(() => {
      result.current.send('Follow up');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[0]).toEqual({ role: 'user', text: 'First question' });
    expect(result.current.messages[1]).toEqual({ role: 'model', text: 'First response' });
    expect(result.current.messages[2]).toEqual({ role: 'user', text: 'Follow up' });
    expect(result.current.messages[3]).toEqual({ role: 'model', text: 'Second response' });
  });

  it('sets generic error message for non-Error throws', async () => {
    mockStreamChatMessage.mockImplementation(async function* () {
      throw 42;
    });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(result.current.error).toBe('Chat request failed');
  });

  it('aborts previous stream when send is called again', async () => {
    let firstSignal: AbortSignal | undefined;
    let callCount = 0;

    mockStreamChatMessage.mockImplementation(async function* (
      _chat: any,
      _msg: string,
      signal: AbortSignal,
    ) {
      callCount++;
      if (callCount === 1) {
        firstSignal = signal;
        // First call blocks
        await new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve());
        });
      } else {
        yield 'Second response';
      }
    });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('First');
    });

    act(() => {
      result.current.send('Second');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(firstSignal?.aborted).toBe(true);
  });

  it('passes the chat session and message to streamChatMessage', async () => {
    const mockSession = { sendMessageStream: vi.fn() };
    mockCreateChat.mockReturnValue(mockSession);
    mockStreamChatMessage.mockReturnValue(asyncGen(['response']));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Test message', 'context');
    });

    await waitFor(() => {
      expect(result.current.streaming).toBe(false);
    });

    expect(mockStreamChatMessage).toHaveBeenCalledWith(
      mockSession,
      'Test message',
      expect.any(AbortSignal),
    );
  });
});
