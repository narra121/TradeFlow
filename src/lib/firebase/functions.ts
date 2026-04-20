import { httpsCallable } from 'firebase/functions';
import { functions } from './init';
import type { TrimmedTrade } from '@/types/insights';

export interface GenerateInsightRequest {
  trades: TrimmedTrade[];
  accountId: string;
  period: string;
  tradesHash: string;
}

export interface GenerateInsightResponse {
  cached: boolean;
  insightId: string;
}

export interface StartChatSessionRequest {
  trades: TrimmedTrade[];
  accountId: string;
  period: string;
  tradesHash: string;
  insightId?: string;
  insightsData?: string;
}

export interface StartChatSessionResponse {
  sessionId: string;
}

export interface SendChatMessageRequest {
  sessionId: string;
  message: string;
}

export interface SendChatMessageResponse {
  success: boolean;
}

export const generateInsightFn = httpsCallable<GenerateInsightRequest, GenerateInsightResponse>(
  functions, 'generateInsight'
);

export const startChatSessionFn = httpsCallable<StartChatSessionRequest, StartChatSessionResponse>(
  functions, 'startChatSession'
);

export const sendChatMessageFn = httpsCallable<SendChatMessageRequest, SendChatMessageResponse>(
  functions, 'sendChatMessage'
);
