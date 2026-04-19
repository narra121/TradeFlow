import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Trade } from '@/types/trade';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockStartChatSessionFn = vi.fn();
const mockSendChatMessageFn = vi.fn();
const mockListenToMessages = vi.fn();
const mockListenToChatSession = vi.fn();
const mockTrimTrades = vi.fn();
const mockSha256Hex = vi.fn();

vi.mock('@/lib/firebase/functions', () => ({
  startChatSessionFn: (...args: any[]) => mockStartChatSessionFn(...args),
  sendChatMessageFn: (...args: any[]) => mockSendChatMessageFn(...args),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  listenToMessages: (...args: any[]) => mockListenToMessages(...args),
  listenToChatSession: (...args: any[]) => mockListenToChatSession(...args),
}));

vi.mock('@/lib/firebase/trades', () => ({
  trimTrades: (...args: any[]) => mockTrimTrades(...args),
}));

vi.mock('@/lib/cache/hash', () => ({
  sha256Hex: (...args: any[]) => mockSha256Hex(...args),
}));

vi.mock('@/lib/firebase/init', () => ({
  app: { name: 'mock-app' },
}));

const mockGetAuth = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

describe('useFirebaseChat', () => {
  let useFirebaseChat: typeof import('../useFirebaseChat').useFirebaseChat;
  const mockUnsubMsgs = vi.fn();
  const mockUnsubSession = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetAuth.mockReturnValue({ currentUser: { uid: 'user-123' } });
    mockTrimTrades.mockImplementation((trades: Trade[]) => trades.map((t) => ({ tradeId: t.id })));
    mockSha256Hex.mockResolvedValue('hash-abc');
    mockStartChatSessionFn.mockResolvedValue({ data: { sessionId: 'session-42' } });
    mockSendChatMessageFn.mockResolvedValue({ data: { success: true } });
    mockListenToMessages.mockReturnValue(mockUnsubMsgs);
    mockListenToChatSession.mockReturnValue(mockUnsubSession);

    const mod = await import('../useFirebaseChat');
    useFirebaseChat = mod.useFirebaseChat;
  });

  it('returns initial state with empty messages and streaming=false', () => {
    const { result } = renderHook(() => useFirebaseChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.sessionId).toBeNull();
    expect(result.current.messageCount).toBe(0);
    expect(result.current.messageLimit).toBe(25);
    expect(typeof result.current.startSession).toBe('function');
    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.abort).toBe('function');
  });

  it('startSession calls Cloud Function with trimmed trades', async () => {
    const trades = [makeTrade()];
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession(trades, 'acc-1', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockStartChatSessionFn).toHaveBeenCalledWith({
        trades: [{ tradeId: 'trade-1' }],
        accountId: 'acc-1',
        period: 'thisMonth',
        tradesHash: 'hash-abc',
      });
    });
  });

  it('sets sessionId after startSession resolves', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisWeek');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });
  });

  it('sets up Firestore listeners after session is created', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToMessages).toHaveBeenCalledWith(
        'user-123',
        'session-42',
        expect.any(Function),
      );
      expect(mockListenToChatSession).toHaveBeenCalledWith(
        'user-123',
        'session-42',
        expect.any(Function),
      );
    });
  });

  it('syncs messages from Firestore listener', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToMessages).toHaveBeenCalled();
    });

    // Get the messages callback
    const msgsCallback = mockListenToMessages.mock.calls[0][2];

    act(() => {
      msgsCallback([
        { role: 'user', text: 'Hello', index: 0, createdAt: { toMillis: () => 1000 } },
        { role: 'model', text: 'Hi there', index: 1, createdAt: { toMillis: () => 2000 } },
      ]);
    });

    expect(result.current.messages).toEqual([
      { role: 'user', text: 'Hello' },
      { role: 'model', text: 'Hi there' },
    ]);
  });

  it('updates streaming state from session status', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToChatSession).toHaveBeenCalled();
    });

    const sessionCallback = mockListenToChatSession.mock.calls[0][2];

    act(() => {
      sessionCallback({ status: 'generating', messageCount: 2 });
    });

    expect(result.current.streaming).toBe(true);
    expect(result.current.messageCount).toBe(2);

    act(() => {
      sessionCallback({ status: 'active', messageCount: 3 });
    });

    expect(result.current.streaming).toBe(false);
    expect(result.current.messageCount).toBe(3);
  });

  it('send calls sendChatMessage Cloud Function', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start session first
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });

    act(() => {
      result.current.send('What is my win rate?');
    });

    await waitFor(() => {
      expect(mockSendChatMessageFn).toHaveBeenCalledWith({
        sessionId: 'session-42',
        message: 'What is my win rate?',
      });
    });
  });

  it('send does nothing when streaming', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start session
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });

    // Simulate streaming state via session listener
    const sessionCallback = mockListenToChatSession.mock.calls[0][2];
    act(() => {
      sessionCallback({ status: 'generating', messageCount: 1 });
    });

    // Try to send while streaming
    act(() => {
      result.current.send('Another question');
    });

    expect(mockSendChatMessageFn).not.toHaveBeenCalled();
  });

  it('send does nothing when no session exists', () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.send('Hello');
    });

    expect(mockSendChatMessageFn).not.toHaveBeenCalled();
  });

  it('handles startSession error', async () => {
    mockStartChatSessionFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('handles rate limit error on startSession', async () => {
    mockStartChatSessionFn.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'Too many sessions',
    });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Session limit exceeded. Please try again later.');
    });
  });

  it('handles send error', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });

    mockSendChatMessageFn.mockRejectedValue(new Error('Send failed'));

    act(() => {
      result.current.send('Test');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Send failed');
    });

    expect(result.current.streaming).toBe(false);
  });

  it('handles rate limit error on send', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });

    mockSendChatMessageFn.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'Message limit reached',
    });

    act(() => {
      result.current.send('Test');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Message limit reached for this session.');
    });
  });

  it('handles unauthenticated error', async () => {
    mockGetAuth.mockReturnValue({ currentUser: null });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Not authenticated with Firebase');
    });
  });

  it('cleans up listeners on unmount', async () => {
    const { result, unmount } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToMessages).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubMsgs).toHaveBeenCalled();
    expect(mockUnsubSession).toHaveBeenCalled();
  });

  it('cleans up previous session listeners when starting a new session', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start first session
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-42');
    });

    // Start second session — previous listeners should be cleaned up
    mockStartChatSessionFn.mockResolvedValue({ data: { sessionId: 'session-99' } });

    await act(async () => {
      result.current.startSession([makeTrade()], 'acc-2', 'thisWeek');
    });

    expect(mockUnsubMsgs).toHaveBeenCalled();
    expect(mockUnsubSession).toHaveBeenCalled();
  });
});
