import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock firebase/firestore
// ---------------------------------------------------------------------------
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

// Mock firebase init
vi.mock('../init', () => ({
  db: { type: 'mock-firestore' },
}));

import {
  getInsightOnce,
  listenToInsight,
  listenToMessages,
  listenToChatSession,
  listenToRateLimits,
} from '../firestore';

describe('Firestore listeners', () => {
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue('mock-doc-ref');
    mockCollection.mockReturnValue('mock-col-ref');
    mockQuery.mockReturnValue('mock-query');
    mockOrderBy.mockReturnValue('mock-order');
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);
  });

  // ── getInsightOnce ──────────────────────────────────────────────────

  describe('getInsightOnce', () => {
    it('creates doc ref with correct path', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
      await getInsightOnce('user-1', 'insight-1');

      expect(mockDoc).toHaveBeenCalledWith(
        { type: 'mock-firestore' },
        'users',
        'user-1',
        'insights',
        'insight-1',
      );
    });

    it('returns data when document exists', async () => {
      const insightData = { status: 'complete', summary: 'Test summary', tradesHash: 'abc123' };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => insightData,
      });

      const result = await getInsightOnce('user-1', 'insight-1');
      expect(result).toEqual(insightData);
    });

    it('returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await getInsightOnce('user-1', 'insight-1');
      expect(result).toBeNull();
    });
  });

  // ── listenToInsight ─────────────────────────────────────────────────

  describe('listenToInsight', () => {
    it('creates doc ref with correct path', () => {
      const callback = vi.fn();
      listenToInsight('user-1', 'insight-1', callback);

      expect(mockDoc).toHaveBeenCalledWith(
        { type: 'mock-firestore' },
        'users',
        'user-1',
        'insights',
        'insight-1',
      );
    });

    it('calls onSnapshot with doc ref and returns unsubscribe', () => {
      const callback = vi.fn();
      const unsub = listenToInsight('user-1', 'insight-1', callback);

      expect(mockOnSnapshot).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.any(Function),
        expect.any(Function),
      );
      expect(unsub).toBe(mockUnsubscribe);
    });

    it('calls callback with data when snapshot exists', () => {
      const callback = vi.fn();
      listenToInsight('user-1', 'insight-1', callback);

      // Get the success handler passed to onSnapshot
      const successHandler = mockOnSnapshot.mock.calls[0][1];
      const mockSnapshot = {
        exists: () => true,
        data: () => ({ status: 'complete', summary: 'Test summary' }),
      };
      successHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith({ status: 'complete', summary: 'Test summary' });
    });

    it('calls callback with null when snapshot does not exist', () => {
      const callback = vi.fn();
      listenToInsight('user-1', 'insight-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      const mockSnapshot = {
        exists: () => false,
        data: () => null,
      };
      successHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('calls onError handler when snapshot errors', () => {
      const callback = vi.fn();
      const onError = vi.fn();
      listenToInsight('user-1', 'insight-1', callback, onError);

      const errorHandler = mockOnSnapshot.mock.calls[0][2];
      const err = new Error('Permission denied');
      errorHandler(err);

      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  // ── listenToMessages ────────────────────────────────────────────────

  describe('listenToMessages', () => {
    it('creates collection ref and orders by index', () => {
      const callback = vi.fn();
      listenToMessages('user-1', 'session-1', callback);

      expect(mockCollection).toHaveBeenCalledWith(
        { type: 'mock-firestore' },
        'users',
        'user-1',
        'chatSessions',
        'session-1',
        'messages',
      );
      expect(mockOrderBy).toHaveBeenCalledWith('index');
      expect(mockQuery).toHaveBeenCalledWith('mock-col-ref', 'mock-order');
    });

    it('maps snapshot docs to data array', () => {
      const callback = vi.fn();
      listenToMessages('user-1', 'session-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      const mockSnapshot = {
        docs: [
          { data: () => ({ role: 'user', text: 'Hello', index: 0 }) },
          { data: () => ({ role: 'model', text: 'Hi there', index: 1 }) },
        ],
      };
      successHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([
        { role: 'user', text: 'Hello', index: 0 },
        { role: 'model', text: 'Hi there', index: 1 },
      ]);
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = listenToMessages('user-1', 'session-1', callback);
      expect(unsub).toBe(mockUnsubscribe);
    });

    it('calls onError handler on failure', () => {
      const callback = vi.fn();
      const onError = vi.fn();
      listenToMessages('user-1', 'session-1', callback, onError);

      const errorHandler = mockOnSnapshot.mock.calls[0][2];
      const err = new Error('Firestore error');
      errorHandler(err);

      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  // ── listenToChatSession ─────────────────────────────────────────────

  describe('listenToChatSession', () => {
    it('creates doc ref with correct path', () => {
      const callback = vi.fn();
      listenToChatSession('user-1', 'session-1', callback);

      expect(mockDoc).toHaveBeenCalledWith(
        { type: 'mock-firestore' },
        'users',
        'user-1',
        'chatSessions',
        'session-1',
      );
    });

    it('calls callback with data when snapshot exists', () => {
      const callback = vi.fn();
      listenToChatSession('user-1', 'session-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      const sessionData = { status: 'active', messageCount: 5 };
      successHandler({ exists: () => true, data: () => sessionData });

      expect(callback).toHaveBeenCalledWith(sessionData);
    });

    it('calls callback with null when snapshot does not exist', () => {
      const callback = vi.fn();
      listenToChatSession('user-1', 'session-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      successHandler({ exists: () => false, data: () => null });

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = listenToChatSession('user-1', 'session-1', callback);
      expect(unsub).toBe(mockUnsubscribe);
    });
  });

  // ── listenToRateLimits ──────────────────────────────────────────────

  describe('listenToRateLimits', () => {
    it('creates doc ref for rateLimits/current', () => {
      const callback = vi.fn();
      listenToRateLimits('user-1', callback);

      expect(mockDoc).toHaveBeenCalledWith(
        { type: 'mock-firestore' },
        'users',
        'user-1',
        'rateLimits',
        'current',
      );
    });

    it('calls callback with data when snapshot exists', () => {
      const callback = vi.fn();
      listenToRateLimits('user-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      const rateLimitData = {
        insightGenerations: { count: 3, windowStart: { toMillis: () => 1000 } },
      };
      successHandler({ exists: () => true, data: () => rateLimitData });

      expect(callback).toHaveBeenCalledWith(rateLimitData);
    });

    it('calls callback with null when snapshot does not exist', () => {
      const callback = vi.fn();
      listenToRateLimits('user-1', callback);

      const successHandler = mockOnSnapshot.mock.calls[0][1];
      successHandler({ exists: () => false, data: () => null });

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('calls onError handler on failure', () => {
      const callback = vi.fn();
      const onError = vi.fn();
      listenToRateLimits('user-1', callback, onError);

      const errorHandler = mockOnSnapshot.mock.calls[0][2];
      const err = new Error('Rate limit error');
      errorHandler(err);

      expect(onError).toHaveBeenCalledWith(err);
    });
  });
});
