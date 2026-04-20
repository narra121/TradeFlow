import { doc, collection, onSnapshot, query, orderBy, limit, getDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from './init';
import type { InsightsResponse } from '@/types/insights';

export type InsightStatus = 'generating' | 'complete' | 'error';

export interface FirestoreInsight {
  status: InsightStatus;
  tradesHash: string;
  accountId: string;
  period: string;
  generatedAt: { toMillis: () => number };
  error?: string;
  summary?: string;
  profile?: InsightsResponse['profile'];
  scores?: InsightsResponse['scores'];
  insights?: InsightsResponse['insights'];
  tradeSpotlights?: InsightsResponse['tradeSpotlights'];
  patterns?: InsightsResponse['patterns'];
}

export interface FirestoreChatSession {
  title?: string;
  accountId: string;
  period: string;
  messageCount: number;
  createdAt: { toMillis: () => number };
  expiresAt: { toMillis: () => number };
  status: 'active' | 'generating' | 'expired';
}

export interface FirestoreChatSessionSummary {
  id: string;
  title?: string;
  accountId: string;
  period: string;
  messageCount: number;
  createdAt: { toMillis: () => number };
  expiresAt: { toMillis: () => number };
  status: 'active' | 'generating' | 'expired';
  insightId?: string;
}

export interface FirestoreChatMessage {
  role: 'user' | 'model';
  text: string;
  createdAt: { toMillis: () => number };
  index: number;
}

export interface RateLimitData {
  insightGenerations?: { count: number; windowStart: { toMillis: () => number } };
  chatSessions?: { count: number; windowStart: { toMillis: () => number } };
}

export async function getInsightOnce(
  userId: string,
  insightId: string,
): Promise<FirestoreInsight | null> {
  const docRef = doc(db, 'users', userId, 'insights', insightId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as FirestoreInsight) : null;
}

export function listenToInsight(
  userId: string,
  insightId: string,
  callback: (data: FirestoreInsight | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const docRef = doc(db, 'users', userId, 'insights', insightId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as FirestoreInsight) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToMessages(
  userId: string,
  sessionId: string,
  callback: (msgs: FirestoreChatMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'chatSessions', sessionId, 'messages');
  const q = query(colRef, orderBy('index'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => d.data() as FirestoreChatMessage);
      callback(msgs);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToChatSession(
  userId: string,
  sessionId: string,
  callback: (data: FirestoreChatSession | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const docRef = doc(db, 'users', userId, 'chatSessions', sessionId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as FirestoreChatSession) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToChatSessions(
  userId: string,
  callback: (sessions: FirestoreChatSessionSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'chatSessions');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FirestoreChatSessionSummary[];
      callback(sessions);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function listenToRateLimits(
  userId: string,
  callback: (data: RateLimitData | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const docRef = doc(db, 'users', userId, 'rateLimits', 'current');
  return onSnapshot(
    docRef,
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as RateLimitData) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}
