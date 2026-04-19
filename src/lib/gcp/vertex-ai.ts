/**
 * Gemini AI streaming client for reports (Flash) and chat (Pro).
 *
 * Uses the Gemini API endpoint (generativelanguage.googleapis.com) which
 * supports CORS for browser requests. Auth via WIF access token from auth.ts.
 *
 * Note: The Vertex AI endpoint (aiplatform.googleapis.com) does NOT support
 * CORS, so we use the Gemini API which accepts the same OAuth2 bearer tokens.
 */

import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';
import { getGoogleAccessToken } from './auth';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const MAX_TRADES = 2000;

const REPORT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const CHAT_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'];
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function getModelUrl(model: string): string {
  return `${GEMINI_API_BASE}/models/${model}:streamGenerateContent`;
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
// Shared: fetch with model fallback chain
// -------------------------------------------------------------------------

async function fetchWithFallback(
  models: string[],
  body: Record<string, unknown>,
  accessToken: string,
  signal: AbortSignal,
): Promise<Response> {
  const errors: string[] = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;

    const res = await fetch(getModelUrl(model), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (res.ok) return res;

    const errText = await res.text().catch(() => '');
    errors.push(`${model}: ${res.status}`);

    if (isLast || !RETRYABLE_STATUS_CODES.includes(res.status)) {
      throw new Error(`Gemini API request failed (${res.status}): ${errText}`);
    }
  }

  throw new Error(`All models failed: ${errors.join(', ')}`);
}

// -------------------------------------------------------------------------
// streamReport — Gemini Flash with Pro fallback
// -------------------------------------------------------------------------

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

  const res = await fetchWithFallback(REPORT_MODELS, body, accessToken, signal);

  const responseText = await res.text();
  const chunks = parseStreamResponse(responseText);

  let accumulated = '';

  for (const chunk of chunks) {
    const textPart = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) continue;

    accumulated += textPart;

    const partial = tryParsePartialInsights(accumulated);
    if (partial) {
      yield partial;
    }
  }

  try {
    const final = JSON.parse(accumulated) as InsightsResponse;
    yield final;
  } catch {
    if (!accumulated.trim()) {
      throw new Error('Empty response from Gemini API');
    }
  }
}

// -------------------------------------------------------------------------
// streamChat — Gemini Pro with Flash fallback
// -------------------------------------------------------------------------

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

  if (context) {
    contents.unshift({
      role: 'user',
      parts: [{ text: `Context for this conversation:\n${context}\n\nPlease acknowledge and be ready to answer questions about my trading performance.` }],
    });
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

  const res = await fetchWithFallback(CHAT_MODELS, body, accessToken, signal);

  const responseText = await res.text();
  const chunks = parseStreamResponse(responseText);

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
function parseStreamResponse(text: string): VertexChunk[] {
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
