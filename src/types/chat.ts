// Mirrors JournalAWSSetup src/features/chat (sessions, messages, SSE events).
import type { QuotaFeature } from './entitlements';

export interface ChatSession {
  id: string;
  title: string;
  insightId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  usage?: { promptTokens: number; outputTokens: number };
  disclaimer?: string;
  model?: string;
  /** trades cited as [#tradeId] in the text; only the user's own */
  tradeIds?: string[];
}

export interface CreateSessionRequest {
  title?: string;
  insightId?: string;
}

/** `event: done` payload. */
export interface ChatDonePayload {
  messageId: string;
  usage: { promptTokens: number; outputTokens: number; remaining: number | null };
  disclaimer: string;
  tradeIds: string[];
  /** true when the question asked for buy/sell advice and got the standard refusal (no quota used) */
  refused?: boolean;
  /** true when the period held more trades than could be loaded; the answer used partial data */
  truncated?: boolean;
}

export interface ChatStreamErrorInfo {
  status: number;
  code: string;
  message: string;
  feature?: QuotaFeature;
  limit?: number;
  resetsAt?: string;
}
