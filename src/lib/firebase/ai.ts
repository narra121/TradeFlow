/**
 * Firebase AI Logic streaming client for reports (Flash) and chat (Pro).
 *
 * Uses the Firebase AI SDK with GoogleAIBackend, which proxies Gemini
 * requests through Firebase infrastructure with per-user rate limiting
 * and App Check support. Replaces direct Gemini API calls via WIF tokens.
 */

import { getGenerativeModel, type ChatSession } from 'firebase/ai';
import { ai } from './init';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';

const MAX_TRADES = 2000;
const REPORT_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL = 'gemini-2.5-flash';

// -------------------------------------------------------------------------
// Trade trimming -- keep only fields relevant for AI analysis
// -------------------------------------------------------------------------
interface TrimmedTrade {
  tradeId: string;
  symbol: string;
  side: string;
  openDate: string;
  closeDate: string;
  pnl: number;
  volume: number;
  accountId?: string;
  tags?: string[];
  brokenRules?: string[];
  mistakes?: string[];
  lessons?: string[];
}

function trimTrades(trades: Trade[]): TrimmedTrade[] {
  const subset = trades.slice(0, MAX_TRADES);
  return subset.map((t) => ({
    tradeId: t.id,
    symbol: t.symbol,
    side: t.direction,
    openDate: t.entryDate,
    closeDate: t.exitDate,
    pnl: t.pnl,
    volume: t.size,
    accountId: t.accountId,
    tags: t.tags,
    brokenRules: t.brokenRuleIds,
    mistakes: t.mistakes,
    lessons: t.keyLesson ? [t.keyLesson] : undefined,
  }));
}

// -------------------------------------------------------------------------
// System prompt for structured report generation
// -------------------------------------------------------------------------
const REPORT_SYSTEM_PROMPT = `You are an expert trading performance analyst. Analyze the provided trade data and return a JSON object with this exact structure:

{
  "profile": {
    "type": "scalper" | "day_trader" | "swing_trader" | "conservative",
    "typeLabel": "Human-readable label",
    "aggressivenessScore": 0-100,
    "aggressivenessLabel": "Low/Medium/High/Very High",
    "trend": "improving/declining/stable" or null,
    "summary": "1-2 sentence profile summary"
  },
  "scores": [
    { "dimension": "Risk Management", "value": 0-100, "label": "Poor/Fair/Good/Excellent" },
    { "dimension": "Consistency", "value": 0-100, "label": "..." },
    { "dimension": "Discipline", "value": 0-100, "label": "..." },
    { "dimension": "Emotional Control", "value": 0-100, "label": "..." }
  ],
  "insights": [
    {
      "severity": "critical" | "warning" | "info" | "strength",
      "title": "Short title",
      "detail": "Detailed explanation",
      "evidence": "Supporting data/numbers",
      "tradeIds": ["optional", "relevant", "trade", "ids"]
    }
  ],
  "tradeSpotlights": [
    {
      "tradeId": "id",
      "symbol": "SYMBOL",
      "date": "YYYY-MM-DD",
      "pnl": 123.45,
      "reason": "Why this trade stands out"
    }
  ],
  "summary": "2-3 paragraph executive summary of trading performance"
}

Return ONLY the JSON object, no markdown or extra text. Include 4-8 insights ordered by severity (critical first). Include 3-5 trade spotlights (mix of best, worst, and most instructive).

Trade data:
`;

// -------------------------------------------------------------------------
// Partial JSON parser for progressive streaming
// -------------------------------------------------------------------------

/**
 * Try to parse the accumulated text as a partial InsightsResponse.
 * Returns null if parsing fails (incomplete JSON).
 */
function tryParsePartialInsights(accumulated: string): Partial<InsightsResponse> | null {
  try {
    return JSON.parse(accumulated);
  } catch {
    // Try to close the JSON object for partial parsing
    let text = accumulated.trim();

    // Remove trailing comma if present
    if (text.endsWith(',')) {
      text = text.slice(0, -1);
    }

    // Count open braces/brackets and close them
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (const ch of text) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
      if (ch === '[') bracketCount++;
      if (ch === ']') bracketCount--;
    }

    // Close open brackets and braces
    let closed = text;
    for (let i = 0; i < bracketCount; i++) closed += ']';
    for (let i = 0; i < braceCount; i++) closed += '}';

    try {
      const parsed = JSON.parse(closed);
      // Only yield if we have at least one meaningful field
      if (parsed.profile || parsed.scores || parsed.insights || parsed.summary) {
        return parsed;
      }
    } catch {
      // Truly unparseable
    }

    return null;
  }
}

// -------------------------------------------------------------------------
// streamReport -- Gemini Flash via Firebase AI
// -------------------------------------------------------------------------

export async function* streamReport(
  trades: Trade[],
  signal: AbortSignal,
): AsyncGenerator<Partial<InsightsResponse>> {
  const model = getGenerativeModel(ai, { model: REPORT_MODEL });
  const trimmed = trimTrades(trades);
  const prompt = REPORT_SYSTEM_PROMPT + JSON.stringify(trimmed);

  const result = await model.generateContentStream(prompt, { signal });

  let accumulated = '';
  for await (const chunk of result.stream) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const text = chunk.text();
    if (!text) continue;
    accumulated += text;
    const partial = tryParsePartialInsights(accumulated);
    if (partial) yield partial;
  }

  try {
    const final = JSON.parse(accumulated) as InsightsResponse;
    yield final;
  } catch {
    if (!accumulated.trim()) throw new Error('Empty response from Gemini');
  }
}

// -------------------------------------------------------------------------
// createChat -- Gemini via Firebase AI with session history
// -------------------------------------------------------------------------

export function createChat(context: string): ChatSession {
  const model = getGenerativeModel(ai, { model: CHAT_MODEL });
  return model.startChat({
    history: context ? [
      { role: 'user', parts: [{ text: `Context:\n${context}\n\nAcknowledge and be ready to answer.` }] },
      { role: 'model', parts: [{ text: 'I\'ve reviewed your trading data. What would you like to know?' }] },
    ] : [],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });
}

// -------------------------------------------------------------------------
// streamChatMessage -- stream a single message in an existing chat session
// -------------------------------------------------------------------------

export async function* streamChatMessage(
  chat: ChatSession,
  message: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const result = await chat.sendMessageStream(message, { signal });
  for await (const chunk of result.stream) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const text = chunk.text();
    if (text) yield text;
  }
}

// Re-export types for consumers
export type { TrimmedTrade };
