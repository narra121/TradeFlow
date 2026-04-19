/**
 * Vertex AI streaming client for Gemini Flash (reports) and Pro (chat).
 *
 * Uses async generators to progressively yield partial results as the
 * streaming response arrives from the Vertex AI endpoint. Auth tokens
 * are obtained via the GCP WIF module (auth.ts).
 */

import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';
import { getGoogleAccessToken } from './auth';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const GCP_PROJECT_ID = import.meta.env.VITE_GCP_PROJECT_ID;
const GCP_REGION = import.meta.env.VITE_GCP_REGION;

const MAX_TRADES = 2000;

const REPORT_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL = 'gemini-2.5-pro';

function getVertexUrl(model: string): string {
  return `https://${GCP_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/publishers/google/models/${model}:streamGenerateContent`;
}

// -------------------------------------------------------------------------
// Trade trimming — keep only fields relevant for AI analysis
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
// streamReport — Gemini Flash for structured report generation
// -------------------------------------------------------------------------

/**
 * Stream a trading performance report from Gemini Flash.
 * Yields partial InsightsResponse objects as sections complete.
 *
 * @param trades Array of trades to analyze (trimmed to max 2000)
 * @param signal AbortSignal for cancellation
 */
export async function* streamReport(
  trades: Trade[],
  signal: AbortSignal,
): AsyncGenerator<Partial<InsightsResponse>> {
  const accessToken = await getGoogleAccessToken();
  const trimmed = trimTrades(trades);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: REPORT_SYSTEM_PROMPT + JSON.stringify(trimmed) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(getVertexUrl(REPORT_MODEL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vertex AI request failed (${res.status}): ${text}`);
  }

  // Vertex AI streamGenerateContent returns a JSON array of response chunks.
  // We read the entire response text and parse incrementally.
  const responseText = await res.text();
  const chunks = parseVertexStreamResponse(responseText);

  let accumulated = '';

  for (const chunk of chunks) {
    const textPart = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) continue;

    accumulated += textPart;

    // Try to parse accumulated JSON so far for progressive yields
    const partial = tryParsePartialInsights(accumulated);
    if (partial) {
      yield partial;
    }
  }

  // Final parse of complete response
  try {
    const final = JSON.parse(accumulated) as InsightsResponse;
    yield final;
  } catch {
    // If we already yielded partial results, that's acceptable
    // If accumulated is truly empty, throw
    if (!accumulated.trim()) {
      throw new Error('Empty response from Vertex AI');
    }
  }
}

// -------------------------------------------------------------------------
// streamChat — Gemini Pro for multi-turn conversation
// -------------------------------------------------------------------------

/**
 * Stream a chat response from Gemini Pro.
 * Yields text chunks for real-time rendering.
 *
 * @param messages Conversation history
 * @param context Additional context (e.g., trade summary) injected as system instruction
 * @param signal AbortSignal for cancellation
 */
export async function* streamChat(
  messages: ChatMessage[],
  context: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const accessToken = await getGoogleAccessToken();

  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Prepend context as a system-level user message if provided
  if (context) {
    contents.unshift({
      role: 'user',
      parts: [{ text: `Context for this conversation:\n${context}\n\nPlease acknowledge and be ready to answer questions about my trading performance.` }],
    });
    // Add a model acknowledgment to maintain proper turn structure
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'I\'ve reviewed your trading data and I\'m ready to help analyze your performance. What would you like to know?' }],
    });
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(getVertexUrl(CHAT_MODEL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vertex AI chat request failed (${res.status}): ${text}`);
  }

  const responseText = await res.text();
  const chunks = parseVertexStreamResponse(responseText);

  for (const chunk of chunks) {
    const textPart = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textPart) {
      yield textPart;
    }
  }
}

// -------------------------------------------------------------------------
// Vertex AI streaming response parser
// -------------------------------------------------------------------------

interface VertexChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Parse the Vertex AI streamGenerateContent response.
 * The response is a JSON array of chunk objects: [{...}, {...}, ...]
 */
function parseVertexStreamResponse(text: string): VertexChunk[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    // Response is an array of chunks
    if (Array.isArray(parsed)) return parsed;
    // Single response object (non-streaming fallback)
    return [parsed];
  } catch {
    // Try to salvage partial JSON array
    return tryParsePartialArray(trimmed);
  }
}

/**
 * Attempt to parse a potentially incomplete JSON array by closing it.
 */
function tryParsePartialArray(text: string): VertexChunk[] {
  // If it starts with '[', try closing the array
  if (text.startsWith('[')) {
    // Find the last complete object
    let lastBrace = text.lastIndexOf('}');
    if (lastBrace > 0) {
      const attempt = text.slice(0, lastBrace + 1) + ']';
      try {
        return JSON.parse(attempt);
      } catch {
        // Fall through
      }
    }
  }
  return [];
}

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
