import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';

// ---------------------------------------------------------------------------
// Mock getGoogleAccessToken
// ---------------------------------------------------------------------------
vi.mock('../auth', () => ({
  getGoogleAccessToken: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    symbol: 'AAPL',
    direction: 'LONG',
    entryPrice: 150,
    exitPrice: 155,
    stopLoss: 148,
    takeProfit: 160,
    size: 100,
    entryDate: '2026-04-10T10:00:00Z',
    exitDate: '2026-04-10T14:00:00Z',
    outcome: 'TP',
    pnl: 500,
    riskRewardRatio: 2.5,
    ...overrides,
  };
}

function makeInsightsResponse(): InsightsResponse {
  return {
    profile: {
      type: 'day_trader',
      typeLabel: 'Day Trader',
      aggressivenessScore: 65,
      aggressivenessLabel: 'Medium',
      trend: 'improving',
      summary: 'Consistent day trader with improving risk management.',
    },
    scores: [
      { dimension: 'Risk Management', value: 72, label: 'Good' },
      { dimension: 'Consistency', value: 68, label: 'Good' },
    ],
    insights: [
      {
        severity: 'warning',
        title: 'Overtrading on Mondays',
        detail: 'You take 40% more trades on Mondays.',
        evidence: 'Average 8 trades on Mon vs 5 on other days.',
      },
    ],
    tradeSpotlights: [
      {
        tradeId: 'trade-1',
        symbol: 'AAPL',
        date: '2026-04-10',
        pnl: 500,
        reason: 'Clean execution with proper risk management.',
      },
    ],
    summary: 'Overall solid performance with room for improvement in consistency.',
  };
}

function makeVertexStreamResponse(chunks: any[]): string {
  return JSON.stringify(chunks);
}

function makeVertexChunk(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  };
}

function makeSuccessResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue(JSON.parse(body)),
  };
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('Vertex AI streaming client', () => {
  let streamReport: typeof import('../vertex-ai').streamReport;
  let streamChat: typeof import('../vertex-ai').streamChat;
  let getGoogleAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    vi.resetModules();
    const authMod = await import('../auth');
    getGoogleAccessToken = authMod.getGoogleAccessToken as ReturnType<typeof vi.fn>;
    getGoogleAccessToken.mockResolvedValue('test-gcp-token');

    const vertexMod = await import('../vertex-ai');
    streamReport = vertexMod.streamReport;
    streamChat = vertexMod.streamChat;
  });

  // -----------------------------------------------------------------------
  // streamReport
  // -----------------------------------------------------------------------
  describe('streamReport', () => {
    it('yields a complete InsightsResponse from streamed chunks', async () => {
      const insights = makeInsightsResponse();
      const jsonStr = JSON.stringify(insights);

      // Split the JSON into two chunks
      const midpoint = Math.floor(jsonStr.length / 2);
      const chunk1 = jsonStr.slice(0, midpoint);
      const chunk2 = jsonStr.slice(midpoint);

      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(chunk1),
        makeVertexChunk(chunk2),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const results: Partial<InsightsResponse>[] = [];

      for await (const partial of streamReport([makeTrade()], controller.signal)) {
        results.push(partial);
      }

      // Should have at least the final complete result
      expect(results.length).toBeGreaterThanOrEqual(1);
      const last = results[results.length - 1];
      expect(last.profile).toBeDefined();
      expect(last.scores).toBeDefined();
      expect(last.insights).toBeDefined();
      expect(last.summary).toBeDefined();
    });

    it('sends correct request to Vertex AI endpoint', async () => {
      const insights = makeInsightsResponse();
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(JSON.stringify(insights)),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamReport([makeTrade()], controller.signal)) {
        // consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('streamGenerateContent');
      expect(url).toContain('gemini-2.5-flash');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer test-gcp-token');
      expect(opts.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(opts.body);
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe('user');
      expect(body.generationConfig.responseMimeType).toBe('application/json');
    });

    it('trims trades to essential fields', async () => {
      const trade = makeTrade({
        notes: 'should be stripped',
        setup: 'should be stripped',
        strategy: 'should be stripped',
        tags: ['swing', 'earnings'],
        brokenRuleIds: ['rule-1'],
        mistakes: ['FOMO'],
        keyLesson: 'Patience pays',
        accountId: 'acc-1',
      });

      const insights = makeInsightsResponse();
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(JSON.stringify(insights)),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamReport([trade], controller.signal)) {
        // consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const promptText = body.contents[0].parts[0].text;

      // Should contain trimmed fields
      expect(promptText).toContain('trade-1');
      expect(promptText).toContain('AAPL');
      expect(promptText).toContain('LONG');
      expect(promptText).toContain('swing');
      expect(promptText).toContain('rule-1');
      expect(promptText).toContain('FOMO');
      expect(promptText).toContain('Patience pays');

      // Should NOT contain non-essential fields
      expect(promptText).not.toContain('should be stripped');
    });

    it('limits trades to 2000', async () => {
      const trades: Trade[] = [];
      for (let i = 0; i < 2500; i++) {
        trades.push(makeTrade({ id: `trade-${i}` }));
      }

      const insights = makeInsightsResponse();
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(JSON.stringify(insights)),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamReport(trades, controller.signal)) {
        // consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const promptText = body.contents[0].parts[0].text;
      // Extract the JSON array of trades from the prompt text
      const tradeDataStart = promptText.indexOf('[{');
      const tradeDataEnd = promptText.lastIndexOf('}]') + 2;
      const tradeData = JSON.parse(promptText.slice(tradeDataStart, tradeDataEnd));
      expect(tradeData).toHaveLength(2000);
    });

    it('throws on Vertex AI error response', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(403, 'Permission denied'));

      const controller = new AbortController();
      const gen = streamReport([makeTrade()], controller.signal);

      await expect(gen.next()).rejects.toThrow('Vertex AI request failed (403)');
    });

    it('calls getGoogleAccessToken before making request', async () => {
      const insights = makeInsightsResponse();
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(JSON.stringify(insights)),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamReport([makeTrade()], controller.signal)) {
        // consume
      }

      expect(getGoogleAccessToken).toHaveBeenCalledTimes(1);
    });

    it('propagates auth errors', async () => {
      getGoogleAccessToken.mockRejectedValueOnce(new Error('No Cognito ID token available'));

      const controller = new AbortController();
      const gen = streamReport([makeTrade()], controller.signal);

      await expect(gen.next()).rejects.toThrow('No Cognito ID token available');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('passes abort signal to fetch', async () => {
      const insights = makeInsightsResponse();
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk(JSON.stringify(insights)),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamReport([makeTrade()], controller.signal)) {
        // consume
      }

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.signal).toBe(controller.signal);
    });

    it('handles abort signal cancellation', async () => {
      const controller = new AbortController();
      controller.abort();

      mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      const gen = streamReport([makeTrade()], controller.signal);

      await expect(gen.next()).rejects.toThrow('aborted');
    });

    it('handles single-object response (non-array)', async () => {
      const insights = makeInsightsResponse();
      // Single object instead of array
      const responseBody = JSON.stringify(makeVertexChunk(JSON.stringify(insights)));

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const results: Partial<InsightsResponse>[] = [];

      for await (const partial of streamReport([makeTrade()], controller.signal)) {
        results.push(partial);
      }

      expect(results.length).toBeGreaterThanOrEqual(1);
      const last = results[results.length - 1];
      expect(last.profile).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // streamChat
  // -----------------------------------------------------------------------
  describe('streamChat', () => {
    it('yields text chunks from streamed response', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Hello, '),
        makeVertexChunk('I can help '),
        makeVertexChunk('with your trades!'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const messages = [{ role: 'user' as const, text: 'How am I doing?' }];
      const chunks: string[] = [];

      for await (const chunk of streamChat(messages, '', controller.signal)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello, ', 'I can help ', 'with your trades!']);
    });

    it('sends correct request to Vertex AI chat endpoint', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Response text'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const messages = [
        { role: 'user' as const, text: 'First question' },
        { role: 'model' as const, text: 'First answer' },
        { role: 'user' as const, text: 'Follow-up' },
      ];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamChat(messages, '', controller.signal)) {
        // consume
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('gemini-2.5-pro');
      expect(url).toContain('streamGenerateContent');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer test-gcp-token');

      const body = JSON.parse(opts.body);
      // No context provided, so messages map directly
      expect(body.contents).toHaveLength(3);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toBe('First question');
      expect(body.contents[1].role).toBe('model');
      expect(body.contents[2].role).toBe('user');
    });

    it('prepends context as system-level messages when provided', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Noted.'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const messages = [{ role: 'user' as const, text: 'What are my mistakes?' }];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamChat(messages, 'Your win rate is 55%.', controller.signal)) {
        // consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Context adds user + model messages before the actual messages
      expect(body.contents.length).toBe(3); // context_user + context_model + user_question
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toContain('Your win rate is 55%');
      expect(body.contents[1].role).toBe('model');
      expect(body.contents[2].role).toBe('user');
      expect(body.contents[2].parts[0].text).toBe('What are my mistakes?');
    });

    it('throws on Vertex AI error response', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Internal error'));

      const controller = new AbortController();
      const gen = streamChat([{ role: 'user', text: 'Hi' }], '', controller.signal);

      await expect(gen.next()).rejects.toThrow('Vertex AI chat request failed (500)');
    });

    it('calls getGoogleAccessToken before making request', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Hi'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamChat([{ role: 'user', text: 'Hi' }], '', controller.signal)) {
        // consume
      }

      expect(getGoogleAccessToken).toHaveBeenCalledTimes(1);
    });

    it('passes abort signal to fetch', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Response'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of streamChat([{ role: 'user', text: 'Hi' }], '', controller.signal)) {
        // consume
      }

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.signal).toBe(controller.signal);
    });

    it('skips chunks with no text content', async () => {
      const responseBody = makeVertexStreamResponse([
        makeVertexChunk('Hello'),
        { candidates: [{ content: { parts: [{}] } }] }, // empty part
        makeVertexChunk('World'),
      ]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const chunks: string[] = [];

      for await (const chunk of streamChat([{ role: 'user', text: 'Hi' }], '', controller.signal)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', 'World']);
    });

    it('handles empty response', async () => {
      const responseBody = makeVertexStreamResponse([]);

      mockFetch.mockResolvedValueOnce(makeSuccessResponse(responseBody));

      const controller = new AbortController();
      const chunks: string[] = [];

      for await (const chunk of streamChat([{ role: 'user', text: 'Hi' }], '', controller.signal)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });
  });
});
