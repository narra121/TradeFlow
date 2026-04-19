import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import type { Trade } from '@/types/trade';
import type { ChatMessage } from '@/types/insights';
import { trimTrades } from '@/lib/firebase/trades';
import { startChatSessionFn, sendChatMessageFn } from '@/lib/firebase/functions';
import { listenToMessages, listenToChatSession, type FirestoreChatMessage } from '@/lib/firebase/firestore';
import { sha256Hex } from '@/lib/cache/hash';
import { app } from '@/lib/firebase/init';

// -------------------------------------------------------------------------
// useFirebaseChat -- session-based chat via Cloud Functions + Firestore
// -------------------------------------------------------------------------

interface UseFirebaseChatResult {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  sessionId: string | null;
  messageCount: number;
  messageLimit: number;
  startSession: (trades: Trade[], accountId: string, period: string) => void;
  send: (text: string) => void;
  abort: () => void;
}

/**
 * Hook for session-based multi-turn chat via Cloud Functions + Firestore.
 *
 * startSession() calls the startChatSession Cloud Function and sets up Firestore
 * listeners for messages and session status. send() calls sendChatMessage which
 * writes to Firestore; listeners pick up new messages automatically.
 */
export function useFirebaseChat(): UseFirebaseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const unsubMsgsRef = useRef<(() => void) | null>(null);
  const unsubSessionRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    setStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    unsubMsgsRef.current?.();
    unsubSessionRef.current?.();
  }, []);

  const startSession = useCallback((trades: Trade[], accountId: string, period: string) => {
    // Clean up previous session listeners
    unsubMsgsRef.current?.();
    unsubSessionRef.current?.();
    setMessages([]);
    setError(null);
    setSessionId(null);
    setMessageCount(0);

    const run = async () => {
      try {
        const auth = getAuth(app);
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated with Firebase');

        const trimmed = trimTrades(trades);
        const tradesHash = await sha256Hex(JSON.stringify(trimmed));

        const result = await startChatSessionFn({ trades: trimmed, accountId, period, tradesHash });
        const newSessionId = result.data.sessionId;
        setSessionId(newSessionId);

        // Listen to messages subcollection
        const unsubMsgs = listenToMessages(userId, newSessionId, (msgs) => {
          setMessages(msgs.map((m: FirestoreChatMessage) => ({
            role: m.role,
            text: m.text,
          })));
        });
        unsubMsgsRef.current = unsubMsgs;

        // Listen to session document for status and message count
        const unsubSession = listenToChatSession(userId, newSessionId, (session) => {
          if (!session) return;
          setMessageCount(session.messageCount);
          setStreaming(session.status === 'generating');
        });
        unsubSessionRef.current = unsubSession;
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
          const fbErr = err as { code: string; message: string };
          if (fbErr.code === 'functions/resource-exhausted') {
            setError('Session limit exceeded. Please try again later.');
          } else {
            setError(fbErr.message || 'Failed to start chat session');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to start chat session');
        }
      }
    };

    run();
  }, []);

  const send = useCallback((text: string) => {
    if (!sessionId || streaming) return;
    setError(null);
    setStreaming(true);

    const run = async () => {
      try {
        await sendChatMessageFn({ sessionId, message: text });
        // Firestore listeners will pick up the new messages automatically
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
          const fbErr = err as { code: string; message: string };
          if (fbErr.code === 'functions/resource-exhausted') {
            setError('Message limit reached for this session.');
          } else {
            setError(fbErr.message || 'Failed to send message');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to send message');
        }
        setStreaming(false);
      }
    };

    run();
  }, [sessionId, streaming]);

  return { messages, streaming, error, sessionId, messageCount, messageLimit: 25, startSession, send, abort };
}
