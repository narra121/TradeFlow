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
const mockListenToChatSessions = vi.fn();
const mockTrimTrades = vi.fn();
const mockSha256Hex = vi.fn();

vi.mock('@/lib/firebase/functions', () => ({
  startChatSessionFn: (...args: any[]) => mockStartChatSessionFn(...args),
  sendChatMessageFn: (...args: any[]) => mockSendChatMessageFn(...args),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  listenToMessages: (...args: any[]) => mockListenToMessages(...args),
  listenToChatSession: (...args: any[]) => mockListenToChatSession(...args),
  listenToChatSessions: (...args: any[]) => mockListenToChatSessions(...args),
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

const mockOnAuthStateChanged = vi.fn();
const mockGetAuth = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
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
  const mockUnsubSessions = vi.fn();
  const mockUnsubAuth = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetAuth.mockReturnValue({ currentUser: { uid: 'user-123' } });
    mockOnAuthStateChanged.mockImplementation((_auth: any, callback: (user: any) => void) => {
      callback({ uid: 'user-123' });
      return mockUnsubAuth;
    });
    mockTrimTrades.mockImplementation((trades: Trade[]) => trades.map((t) => ({ tradeId: t.id })));
    mockSha256Hex.mockResolvedValue('hash-abc');
    mockStartChatSessionFn.mockResolvedValue({ data: { sessionId: 'session-42' } });
    mockSendChatMessageFn.mockResolvedValue({ data: { success: true } });
    mockListenToMessages.mockReturnValue(mockUnsubMsgs);
    mockListenToChatSession.mockReturnValue(mockUnsubSession);
    mockListenToChatSessions.mockReturnValue(mockUnsubSessions);

    const mod = await import('../useFirebaseChat');
    useFirebaseChat = mod.useFirebaseChat;
  });

  it('returns initial state with empty messages and streaming=false', () => {
    const { result } = renderHook(() => useFirebaseChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.messageCount).toBe(0);
    expect(result.current.messageLimit).toBe(25);
    expect(result.current.sessions).toEqual([]);
    expect(result.current.sessionSwitching).toBe(false);
    expect(typeof result.current.startSession).toBe('function');
    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.switchSession).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
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

  it('sets activeSessionId after startSession resolves', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisWeek');
    });

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-42');
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
      expect(result.current.activeSessionId).toBe('session-42');
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
      expect(result.current.activeSessionId).toBe('session-42');
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
      expect(result.current.error).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  it('handles send error', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-42');
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
      expect(result.current.activeSessionId).toBe('session-42');
    });

    mockSendChatMessageFn.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'Message limit reached',
    });

    act(() => {
      result.current.send('Test');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Rate limit exceeded. Please try again later.');
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
    expect(mockUnsubSessions).toHaveBeenCalled();
    expect(mockUnsubAuth).toHaveBeenCalled();
  });

  it('cleans up previous session listeners when starting a new session', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start first session
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-42');
    });

    // Start second session — previous listeners should be cleaned up
    mockStartChatSessionFn.mockResolvedValue({ data: { sessionId: 'session-99' } });

    await act(async () => {
      result.current.startSession([makeTrade()], 'acc-2', 'thisWeek');
    });

    expect(mockUnsubMsgs).toHaveBeenCalled();
    expect(mockUnsubSession).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // New tests for session listing and switching
  // ---------------------------------------------------------------------------

  it('loads session list on mount', async () => {
    const mockSessions = [
      {
        id: 'sess-1',
        title: 'Morning trades',
        accountId: 'acc-1',
        period: 'thisMonth',
        messageCount: 5,
        createdAt: { toMillis: () => 2000 },
        expiresAt: { toMillis: () => 90000 },
        status: 'active' as const,
      },
      {
        id: 'sess-2',
        accountId: 'ALL',
        period: 'thisWeek',
        messageCount: 2,
        createdAt: { toMillis: () => 1000 },
        expiresAt: { toMillis: () => 80000 },
        status: 'expired' as const,
      },
    ];

    mockListenToChatSessions.mockImplementation(
      (_userId: string, callback: (sessions: any[]) => void) => {
        callback(mockSessions);
        return mockUnsubSessions;
      },
    );

    const { result } = renderHook(() => useFirebaseChat());

    await waitFor(() => {
      expect(result.current.sessions).toEqual(mockSessions);
    });

    expect(mockListenToChatSessions).toHaveBeenCalledWith(
      'user-123',
      expect.any(Function),
    );
  });

  it('switchSession updates activeSessionId', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.switchSession('sess-abc');
    });

    expect(result.current.activeSessionId).toBe('sess-abc');
    expect(mockListenToMessages).toHaveBeenCalledWith(
      'user-123',
      'sess-abc',
      expect.any(Function),
    );
    expect(mockListenToChatSession).toHaveBeenCalledWith(
      'user-123',
      'sess-abc',
      expect.any(Function),
    );
  });

  it('switchSession tears down previous listeners', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start a session first to set up listeners
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-42');
    });

    // Clear mocks to track new calls
    mockUnsubMsgs.mockClear();
    mockUnsubSession.mockClear();

    // Switch to a different session
    act(() => {
      result.current.switchSession('sess-other');
    });

    // Previous listeners should have been cleaned up
    expect(mockUnsubMsgs).toHaveBeenCalledTimes(1);
    expect(mockUnsubSession).toHaveBeenCalledTimes(1);
    expect(result.current.activeSessionId).toBe('sess-other');
  });

  it('new session appears after startSession', async () => {
    const sessionsList: any[] = [];

    mockListenToChatSessions.mockImplementation(
      (_userId: string, callback: (sessions: any[]) => void) => {
        // Initially empty
        callback([...sessionsList]);
        return mockUnsubSessions;
      },
    );

    const { result } = renderHook(() => useFirebaseChat());

    await waitFor(() => {
      expect(result.current.sessions).toEqual([]);
    });

    // Start a session — this calls the Cloud Function
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-42');
    });

    // Simulate Firestore sessions listener firing with the new session
    const sessionsCallback = mockListenToChatSessions.mock.calls[0][1];
    const newSession = {
      id: 'session-42',
      accountId: 'ALL',
      period: 'thisMonth',
      messageCount: 0,
      createdAt: { toMillis: () => 5000 },
      expiresAt: { toMillis: () => 90000 },
      status: 'active' as const,
    };

    act(() => {
      sessionsCallback([newSession]);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).toBe('session-42');
  });

  it('sessionsLoading starts true, becomes false after first snapshot', async () => {
    // Defer the callback so we can observe the loading state
    let capturedCallback: ((sessions: any[]) => void) | null = null;
    mockListenToChatSessions.mockImplementation(
      (_userId: string, callback: (sessions: any[]) => void) => {
        capturedCallback = callback;
        return mockUnsubSessions;
      },
    );

    const { result } = renderHook(() => useFirebaseChat());

    // sessionsLoading should be true before callback fires
    expect(result.current.sessionsLoading).toBe(true);

    // Fire the callback
    act(() => {
      capturedCallback!([]);
    });

    expect(result.current.sessionsLoading).toBe(false);
  });

  it('clearError resets error state', async () => {
    mockStartChatSessionFn.mockRejectedValue(new Error('Something went wrong'));

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Something went wrong');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('switchSession clears messages and error', async () => {
    const { result } = renderHook(() => useFirebaseChat());

    // Start session and get some messages
    act(() => {
      result.current.startSession([makeTrade()], 'ALL', 'thisMonth');
    });

    await waitFor(() => {
      expect(mockListenToMessages).toHaveBeenCalled();
    });

    // Inject messages via listener
    const msgsCallback = mockListenToMessages.mock.calls[0][2];
    act(() => {
      msgsCallback([
        { role: 'user', text: 'Hello', index: 0, createdAt: { toMillis: () => 1000 } },
      ]);
    });

    expect(result.current.messages).toHaveLength(1);

    // Switch session — messages should be cleared
    act(() => {
      result.current.switchSession('other-sess');
    });

    // Messages are empty until new listener fires
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('does not set up sessions listener when unauthenticated', () => {
    mockOnAuthStateChanged.mockImplementation((_auth: any, callback: (user: any) => void) => {
      callback(null);
      return mockUnsubAuth;
    });

    const { result } = renderHook(() => useFirebaseChat());

    expect(mockListenToChatSessions).not.toHaveBeenCalled();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.sessionsLoading).toBe(false);
  });

  it('switchSession does nothing when unauthenticated', () => {
    mockGetAuth.mockReturnValue({ currentUser: null });

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.switchSession('sess-abc');
    });

    // No listeners should be set up
    expect(mockListenToMessages).not.toHaveBeenCalled();
    expect(mockListenToChatSession).not.toHaveBeenCalled();
    expect(result.current.activeSessionId).toBeNull();
  });

  it('sessionSwitching becomes false after first message snapshot', async () => {
    let capturedMsgsCallback: ((msgs: any[]) => void) | null = null;
    mockListenToMessages.mockImplementation(
      (_userId: string, _sessionId: string, callback: (msgs: any[]) => void) => {
        capturedMsgsCallback = callback;
        return mockUnsubMsgs;
      },
    );

    const { result } = renderHook(() => useFirebaseChat());

    act(() => {
      result.current.switchSession('sess-xyz');
    });

    // Should be switching until first snapshot
    expect(result.current.sessionSwitching).toBe(true);

    act(() => {
      capturedMsgsCallback!([
        { role: 'model', text: 'Welcome', index: 0, createdAt: { toMillis: () => 1000 } },
      ]);
    });

    expect(result.current.sessionSwitching).toBe(false);
  });
});
