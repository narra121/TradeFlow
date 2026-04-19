import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Trade } from '@/types/trade';
import type { InsightsResponse } from '@/types/insights';

// ---------------------------------------------------------------------------
// Mock firebase/ai
// ---------------------------------------------------------------------------
const mockGenerateContentStream = vi.fn();
const mockSendMessageStream = vi.fn();
const mockStartChat = vi.fn();

const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContentStream: mockGenerateContentStream,
  startChat: mockStartChat,
});

vi.mock('firebase/ai', () => ({
  getGenerativeModel: (...args: any[]) => mockGetGenerativeModel(...args),
}));

// ---------------------------------------------------------------------------
// Mock firebase init
// ---------------------------------------------------------------------------
vi.mock('../init', () => ({
  ai: { app: { name: 'test-app' } },
}));

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

/**
 * Helper to create a mock Firebase stream result from text chunks.
 */
function makeMockStreamResult(texts: string[]) {
  return {
    stream: (async function* () {
      for (const text of texts) {
        yield { text: () => text };
      }
    })(),
    response: Promise.resolve({
      text: () => texts.join(''),
    }),
  };
}

/**
 * Helper to create a mock Firebase stream result that throws.
 */
function makeMockStreamResultWithError(texts: string[], error: Error) {
  return {
    stream: (async function* () {
      for (const text of texts) {
        yield { text: () => text };
      }
      throw error;
    })(),
    response: Promise.reject(error),
  };
}

describe('Firebase AI module', () => {
  let streamReport: typeof import('../ai').streamReport;
  let createChat: typeof import('../ai').createChat;
  let streamChatMessage: typeof import('../ai').streamChatMessage;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockStartChat.mockReturnValue({
      sendMessageStream: mockSendMessageStream,
    });

    vi.resetModules();
    const mod = await import('../ai');
    streamReport = mod.streamReport;
    createChat = mod.createChat;
    streamChatMessage = mod.streamChatMessage;
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

      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([chunk1, chunk2]),
      );

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

    it('calls getGenerativeModel with correct model name', async () => {
      const insights = makeInsightsResponse();
      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([JSON.stringify(insights)]),
      );

      const controller = new AbortController();
      for await (const _ of streamReport([makeTrade()], controller.signal)) {
        // consume
      }

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ model: 'gemini-2.5-flash' }),
      );
    });

    it('passes abort signal to generateContentStream', async () => {
      const insights = makeInsightsResponse();
      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([JSON.stringify(insights)]),
      );

      const controller = new AbortController();
      for await (const _ of streamReport([makeTrade()], controller.signal)) {
        // consume
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
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
      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([JSON.stringify(insights)]),
      );

      const controller = new AbortController();
      for await (const _ of streamReport([trade], controller.signal)) {
        // consume
      }

      const prompt = mockGenerateContentStream.mock.calls[0][0] as string;

      // Should contain trimmed fields
      expect(prompt).toContain('trade-1');
      expect(prompt).toContain('AAPL');
      expect(prompt).toContain('LONG');
      expect(prompt).toContain('swing');
      expect(prompt).toContain('rule-1');
      expect(prompt).toContain('FOMO');
      expect(prompt).toContain('Patience pays');

      // Should NOT contain non-essential fields
      expect(prompt).not.toContain('should be stripped');
    });

    it('limits trades to 2000', async () => {
      const trades: Trade[] = [];
      for (let i = 0; i < 2500; i++) {
        trades.push(makeTrade({ id: `trade-${i}` }));
      }

      const insights = makeInsightsResponse();
      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([JSON.stringify(insights)]),
      );

      const controller = new AbortController();
      for await (const _ of streamReport(trades, controller.signal)) {
        // consume
      }

      const prompt = mockGenerateContentStream.mock.calls[0][0] as string;
      // Extract the JSON array from the prompt
      const tradeDataStart = prompt.indexOf('[{');
      const tradeDataEnd = prompt.lastIndexOf('}]') + 2;
      const tradeData = JSON.parse(prompt.slice(tradeDataStart, tradeDataEnd));
      expect(tradeData).toHaveLength(2000);
    });

    it('throws on empty response', async () => {
      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult(['']),
      );

      const controller = new AbortController();
      const gen = streamReport([makeTrade()], controller.signal);

      await expect(async () => {
        for await (const _ of gen) {
          // consume
        }
      }).rejects.toThrow('Empty response from Gemini');
    });

    it('throws when generateContentStream fails', async () => {
      mockGenerateContentStream.mockRejectedValueOnce(
        new Error('Firebase AI request failed'),
      );

      const controller = new AbortController();
      const gen = streamReport([makeTrade()], controller.signal);

      await expect(gen.next()).rejects.toThrow('Firebase AI request failed');
    });

    it('handles abort signal cancellation', async () => {
      const controller = new AbortController();
      controller.abort();

      mockGenerateContentStream.mockRejectedValueOnce(
        new DOMException('The operation was aborted', 'AbortError'),
      );

      const gen = streamReport([makeTrade()], controller.signal);

      await expect(gen.next()).rejects.toThrow('aborted');
    });

    it('yields partial results as stream chunks arrive', async () => {
      const insights = makeInsightsResponse();
      const jsonStr = JSON.stringify(insights);

      // Give enough of the JSON so partial parsing can extract profile
      const partial1 = jsonStr.slice(0, 200);
      const partial2 = jsonStr.slice(200);

      mockGenerateContentStream.mockResolvedValueOnce(
        makeMockStreamResult([partial1, partial2]),
      );

      const controller = new AbortController();
      const results: Partial<InsightsResponse>[] = [];

      for await (const partial of streamReport([makeTrade()], controller.signal)) {
        results.push(partial);
      }

      // Should have yielded intermediate partials plus the final
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // createChat
  // -----------------------------------------------------------------------
  describe('createChat', () => {
    it('creates a chat session with context history', () => {
      createChat('Your win rate is 55%.');

      expect(mockStartChat).toHaveBeenCalledTimes(1);
      const params = mockStartChat.mock.calls[0][0];
      expect(params.history).toHaveLength(2);
      expect(params.history[0].role).toBe('user');
      expect(params.history[0].parts[0].text).toContain('Your win rate is 55%');
      expect(params.history[1].role).toBe('model');
    });

    it('creates a chat session with empty history when no context', () => {
      createChat('');

      expect(mockStartChat).toHaveBeenCalledTimes(1);
      const params = mockStartChat.mock.calls[0][0];
      expect(params.history).toEqual([]);
    });

    it('sets generation config with temperature and maxOutputTokens', () => {
      createChat('context');

      const params = mockStartChat.mock.calls[0][0];
      expect(params.generationConfig).toEqual({
        temperature: 0.7,
        maxOutputTokens: 2048,
      });
    });
  });

  // -----------------------------------------------------------------------
  // streamChatMessage
  // -----------------------------------------------------------------------
  describe('streamChatMessage', () => {
    it('yields text chunks from streamed response', async () => {
      const chatSession = createChat('');

      mockSendMessageStream.mockResolvedValueOnce(
        makeMockStreamResult(['Hello, ', 'I can help ', 'with your trades!']),
      );

      const controller = new AbortController();
      const chunks: string[] = [];

      for await (const chunk of streamChatMessage(chatSession, 'How am I doing?', controller.signal)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello, ', 'I can help ', 'with your trades!']);
    });

    it('passes abort signal to sendMessageStream', async () => {
      const chatSession = createChat('');

      mockSendMessageStream.mockResolvedValueOnce(
        makeMockStreamResult(['Response']),
      );

      const controller = new AbortController();
      for await (const _ of streamChatMessage(chatSession, 'Hi', controller.signal)) {
        // consume
      }

      expect(mockSendMessageStream).toHaveBeenCalledWith(
        'Hi',
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('skips chunks with empty text', async () => {
      const chatSession = createChat('');

      const streamResult = {
        stream: (async function* () {
          yield { text: () => 'Hello' };
          yield { text: () => '' };
          yield { text: () => 'World' };
        })(),
        response: Promise.resolve({ text: () => 'HelloWorld' }),
      };

      mockSendMessageStream.mockResolvedValueOnce(streamResult);

      const controller = new AbortController();
      const chunks: string[] = [];

      for await (const chunk of streamChatMessage(chatSession, 'Hi', controller.signal)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', 'World']);
    });

    it('throws when sendMessageStream fails', async () => {
      const chatSession = createChat('');

      mockSendMessageStream.mockRejectedValueOnce(
        new Error('Chat request failed'),
      );

      const controller = new AbortController();
      const gen = streamChatMessage(chatSession, 'Hi', controller.signal);

      await expect(gen.next()).rejects.toThrow('Chat request failed');
    });

    it('handles abort signal', async () => {
      const chatSession = createChat('');

      const controller = new AbortController();
      controller.abort();

      mockSendMessageStream.mockRejectedValueOnce(
        new DOMException('The operation was aborted', 'AbortError'),
      );

      const gen = streamChatMessage(chatSession, 'Hi', controller.signal);

      await expect(gen.next()).rejects.toThrow('aborted');
    });

    it('throws AbortError when signal aborted mid-stream', async () => {
      const chatSession = createChat('');

      const controller = new AbortController();

      const streamResult = {
        stream: (async function* () {
          yield { text: () => 'First chunk' };
          // Abort happens between chunks
          controller.abort();
          yield { text: () => 'Second chunk' };
        })(),
        response: Promise.resolve({ text: () => '' }),
      };

      mockSendMessageStream.mockResolvedValueOnce(streamResult);

      const chunks: string[] = [];
      await expect(async () => {
        for await (const chunk of streamChatMessage(chatSession, 'Hi', controller.signal)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Aborted');

      // Should have received the first chunk before abort
      expect(chunks).toEqual(['First chunk']);
    });
  });
});
