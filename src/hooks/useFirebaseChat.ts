import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { ChatMessage } from '@/types/insights';
import { startChatSessionFn, sendChatMessageFn } from '@/lib/firebase/functions';
import {
  listenToMessages,
  listenToChatSession,
  listenToChatSessions,
  type FirestoreChatMessage,
  type FirestoreChatSessionSummary,
} from '@/lib/firebase/firestore';
import { app } from '@/lib/firebase/init';
import { parseFirebaseError } from '@/lib/firebase/errors';
import type { TrimmedTradesData } from './useTrimmedTrades';

export interface UseFirebaseChatResult {
  sessions: FirestoreChatSessionSummary[];
  sessionsLoading: boolean;
  activeSessionId: string | null;
  sessionSwitching: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  messageCount: number;
  messageLimit: number;
  startSession: (trimmedData: TrimmedTradesData, accountId: string, period: string, insightId?: string) => void;
  switchSession: (sessionId: string) => void;
  send: (text: string) => void;
  abort: () => void;
  clearError: () => void;
}

/**
 * Hook for session-based multi-turn chat via Cloud Functions + Firestore.
 *
 * Subscribes to the user's chat sessions collection on mount.
 * startSession() calls the startChatSession Cloud Function and switches to the new session.
 * switchSession() tears down current listeners and subscribes to a different session.
 * send() calls sendChatMessage which writes to Firestore; listeners pick up new messages automatically.
 */
export function useFirebaseChat(options: { enabled?: boolean } = {}): UseFirebaseChatResult {
  const { enabled = true } = options;
  const [sessions, setSessions] = useState<FirestoreChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSwitching, setSessionSwitching] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const unsubMsgsRef = useRef<(() => void) | null>(null);
  const unsubSessionRef = useRef<(() => void) | null>(null);
  const unsubSessionsRef = useRef<(() => void) | null>(null);
  const unsubAuthRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    setStreaming(false);
    unsubMsgsRef.current?.();
    unsubSessionRef.current?.();
    unsubMsgsRef.current = null;
    unsubSessionRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Subscribe to chat sessions collection when Firebase auth is ready
  useEffect(() => {
    if (!enabled) {
      unsubSessionsRef.current?.();
      unsubSessionsRef.current = null;
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    const auth = getAuth(app);

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Tear down previous sessions listener on auth change
      unsubSessionsRef.current?.();
      unsubSessionsRef.current = null;

      if (!user) {
        setSessions([]);
        setSessionsLoading(false);
        return;
      }

      setSessionsLoading(true);
      const unsub = listenToChatSessions(user.uid, (sessionList) => {
        setSessions(sessionList);
        setSessionsLoading(false);
      });
      unsubSessionsRef.current = unsub;
    });

    unsubAuthRef.current = authUnsub;

    return () => {
      authUnsub();
      unsubSessionsRef.current?.();
      unsubMsgsRef.current?.();
      unsubSessionRef.current?.();
    };
  }, [enabled]);

  const switchSession = useCallback((sessionId: string) => {
    const auth = getAuth(app);
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setSessionSwitching(true);

    // Tear down previous session listeners
    unsubMsgsRef.current?.();
    unsubSessionRef.current?.();
    unsubMsgsRef.current = null;
    unsubSessionRef.current = null;

    setActiveSessionId(sessionId);
    setMessages([]);
    setError(null);
    setMessageCount(0);

    // Subscribe to new session's messages
    let firstSnapshot = true;
    const unsubMsgs = listenToMessages(userId, sessionId, (msgs) => {
      setMessages(msgs.map((m: FirestoreChatMessage) => ({
        role: m.role,
        text: m.text,
      })));
      if (firstSnapshot) {
        setSessionSwitching(false);
        firstSnapshot = false;
      }
    });
    unsubMsgsRef.current = unsubMsgs;

    // Subscribe to new session's status
    const unsubSession = listenToChatSession(userId, sessionId, (session) => {
      if (!session) return;
      setMessageCount(session.messageCount);
      setStreaming(session.status === 'generating');
    });
    unsubSessionRef.current = unsubSession;
  }, []);

  const startSession = useCallback((trimmedData: TrimmedTradesData, accountId: string, period: string, insightId?: string) => {
    unsubMsgsRef.current?.();
    unsubSessionRef.current?.();
    unsubMsgsRef.current = null;
    unsubSessionRef.current = null;
    setMessages([]);
    setError(null);
    setActiveSessionId(null);
    setMessageCount(0);

    const run = async () => {
      try {
        const auth = getAuth(app);
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated with Firebase');

        const { trimmed, hash: tradesHash } = trimmedData;

        const result = await startChatSessionFn({
          trades: trimmed,
          accountId,
          period,
          tradesHash,
          insightId,
        });
        const newSessionId = result.data.sessionId;

        // Switch to the new session (sets up all listeners)
        switchSession(newSessionId);
      } catch (err: unknown) {
        setError(parseFirebaseError(err, 'Failed to start chat session'));
      }
    };

    run();
  }, [switchSession]);

  const send = useCallback((text: string) => {
    if (!activeSessionId || streaming) return;
    setError(null);
    setStreaming(true);

    const run = async () => {
      try {
        await sendChatMessageFn({ sessionId: activeSessionId, message: text });
        // Firestore listeners will pick up the new messages automatically
      } catch (err: unknown) {
        setError(parseFirebaseError(err, 'Failed to send message'));
        setStreaming(false);
      }
    };

    run();
  }, [activeSessionId, streaming]);

  return {
    sessions,
    sessionsLoading,
    activeSessionId,
    sessionSwitching,
    messages,
    streaming,
    error,
    messageCount,
    messageLimit: 25,
    startSession,
    switchSession,
    send,
    abort,
    clearError,
  };
}
