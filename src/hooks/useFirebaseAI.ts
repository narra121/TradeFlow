import { useState, useRef, useCallback } from 'react';
import type { ChatSession } from 'firebase/ai';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';
import { ChatMessage } from '@/types/insights';
import { streamReport, createChat, streamChatMessage } from '@/lib/firebase/ai';

// -------------------------------------------------------------------------
// useFirebaseReport -- structured report generation via Gemini Flash
// -------------------------------------------------------------------------

interface UseFirebaseReportResult {
  data: Partial<InsightsResponse> | null;
  streaming: boolean;
  error: string | null;
  generate: (trades: Trade[]) => void;
  abort: () => void;
}

/**
 * Hook for streaming a structured trading performance report from Firebase AI.
 *
 * Calls streamReport() which yields partial InsightsResponse objects as the
 * stream progresses. State updates progressively so the UI can render sections
 * as they arrive.
 */
export function useFirebaseReport(): UseFirebaseReportResult {
  const [data, setData] = useState<Partial<InsightsResponse> | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStreaming(false);
  }, []);

  const generate = useCallback((trades: Trade[]) => {
    // Abort any in-flight request
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setData(null);
    setError(null);
    setStreaming(true);

    const run = async () => {
      try {
        const generator = streamReport(trades, controller.signal);

        for await (const partial of generator) {
          if (controller.signal.aborted) return;
          setData(partial);
        }

        if (!controller.signal.aborted) {
          setStreaming(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : 'Report generation failed',
        );
        setStreaming(false);
      }
    };

    run();
  }, []);

  return { data, streaming, error, generate, abort };
}

// -------------------------------------------------------------------------
// useFirebaseChat -- multi-turn conversation via Gemini
// -------------------------------------------------------------------------

interface UseFirebaseChatResult {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  send: (text: string, context?: string) => void;
  abort: () => void;
}

/**
 * Hook for streaming multi-turn chat with Firebase AI.
 *
 * Maintains a ChatSession ref for multi-turn history. On each send(), the
 * user message is appended to local state, then streamChatMessage() yields
 * text chunks that progressively build the model's response.
 */
export function useFirebaseChat(): UseFirebaseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const chatRef = useRef<ChatSession | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback((text: string, context: string = '') => {
    // Abort any in-flight stream
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    const userMessage: ChatMessage = { role: 'user', text };

    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setStreaming(true);

    const run = async () => {
      try {
        // Initialize chat session on first send (or if context changes)
        if (!chatRef.current) {
          chatRef.current = createChat(context);
        }

        // Add a placeholder model message that we'll update progressively
        const modelMessage: ChatMessage = { role: 'model', text: '' };
        setMessages((prev) => [...prev, modelMessage]);

        const generator = streamChatMessage(chatRef.current, text, controller.signal);
        let accumulated = '';

        for await (const chunk of generator) {
          if (controller.signal.aborted) return;

          accumulated += chunk;

          // Update the last message (model response) progressively
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = { role: 'model', text: accumulated };
            return updated;
          });
        }

        if (!controller.signal.aborted) {
          setStreaming(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        // Remove the empty model message placeholder on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'model' && !last.text) {
            return prev.slice(0, -1);
          }
          return prev;
        });

        setError(
          err instanceof Error ? err.message : 'Chat request failed',
        );
        setStreaming(false);
      }
    };

    run();
  }, []);

  return { messages, streaming, error, send, abort };
}
