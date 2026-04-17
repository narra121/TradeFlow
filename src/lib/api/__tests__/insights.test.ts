import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => storage.set(key, val)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// ---------------------------------------------------------------------------
// Mock axios (used for Function URL path)
// ---------------------------------------------------------------------------
const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    post: (...args: any[]) => mockAxiosPost(...args),
    create: vi.fn(() => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      post: vi.fn(),
    })),
    isAxiosError: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock apiClient (used for API Gateway fallback)
// ---------------------------------------------------------------------------
const mockApiClientPost = vi.fn();
vi.mock('../api', () => ({
  default: {
    post: (...args: any[]) => mockApiClientPost(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const samplePayload = {
  accountId: 'acct-123',
  startDate: '2026-04-01',
  endDate: '2026-04-17',
};

const sampleInsightsResponse = {
  data: {
    profile: {
      type: 'day_trader',
      typeLabel: 'Day Trader',
      aggressivenessScore: 65,
      aggressivenessLabel: 'Moderate',
      trend: 'improving',
      summary: 'Consistent day trader with moderate risk.',
    },
    scores: [{ dimension: 'Discipline', value: 80, label: 'Strong' }],
    insights: [
      {
        severity: 'warning',
        title: 'Overtrading on Mondays',
        detail: 'You take 40% more trades on Mondays.',
        evidence: '12 trades vs 8 avg',
      },
    ],
    tradeSpotlights: [
      {
        tradeId: 'trade-001',
        symbol: 'AAPL',
        date: '2026-04-10',
        pnl: 250,
        reason: 'Clean breakout entry',
      },
    ],
    summary: 'Overall improving performance.',
  },
  meta: {
    cached: false,
    generatedAt: '2026-04-17T12:00:00Z',
    newTradesSince: 5,
    elapsedMs: 4200,
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('insightsApi.generateInsights', () => {
  // -----------------------------------------------------------------------
  // Function URL path (VITE_GENERATE_INSIGHTS_URL is set)
  // -----------------------------------------------------------------------
  describe('when VITE_GENERATE_INSIGHTS_URL is set (Function URL path)', () => {
    let insightsApi: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      storage.clear();
      mockAxiosPost.mockReset();
      mockApiClientPost.mockReset();

      vi.resetModules();
      vi.stubEnv('VITE_GENERATE_INSIGHTS_URL', 'https://lambda.example.com/insights');
      const mod = await import('../insights');
      insightsApi = mod.insightsApi;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('calls axios.post with the Function URL', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost.mock.calls[0][0]).toBe('https://lambda.example.com/insights');
    });

    it('sends the correct payload to the Function URL', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      expect(mockAxiosPost.mock.calls[0][1]).toEqual(samplePayload);
    });

    it('attaches the Authorization header when idToken exists', async () => {
      storage.set('idToken', 'test-token');
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBe('Bearer test-token');
    });

    it('omits Authorization header when no idToken exists', async () => {
      // storage has no idToken
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('uses a 90-second timeout', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.timeout).toBe(90_000);
    });

    it('sets Content-Type to application/json', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers['Content-Type']).toBe('application/json');
    });

    it('returns the full response body when data field exists', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      const result = await insightsApi.generateInsights(samplePayload);

      // insights returns body (with data + meta) unlike trades which unwraps body.data
      expect(result).toEqual(sampleInsightsResponse);
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
    });

    it('returns body directly when no data wrapper is present', async () => {
      const flatBody = { profile: { type: 'scalper' }, summary: 'Aggressive scalper.' };
      mockAxiosPost.mockResolvedValueOnce({ data: flatBody });

      const result = await insightsApi.generateInsights(samplePayload);

      expect(result).toEqual(flatBody);
    });

    it('does not call apiClient when Function URL is configured', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      await insightsApi.generateInsights(samplePayload);

      expect(mockApiClientPost).not.toHaveBeenCalled();
    });

    it('propagates errors from axios', async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error('Lambda timeout'));

      await expect(
        insightsApi.generateInsights(samplePayload),
      ).rejects.toThrow('Lambda timeout');
    });

    it('propagates network errors from axios', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      mockAxiosPost.mockRejectedValueOnce(networkError);

      await expect(
        insightsApi.generateInsights(samplePayload),
      ).rejects.toThrow('Network Error');
    });

    it('sends payload without optional accountId', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: sampleInsightsResponse });

      const minimalPayload = { startDate: '2026-04-01', endDate: '2026-04-17' };
      await insightsApi.generateInsights(minimalPayload);

      expect(mockAxiosPost.mock.calls[0][1]).toEqual(minimalPayload);
    });
  });

  // -----------------------------------------------------------------------
  // API Gateway fallback (VITE_GENERATE_INSIGHTS_URL is NOT set)
  // -----------------------------------------------------------------------
  describe('when VITE_GENERATE_INSIGHTS_URL is not set (API Gateway fallback)', () => {
    let insightsApi: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      storage.clear();
      mockAxiosPost.mockReset();
      mockApiClientPost.mockReset();

      vi.resetModules();
      vi.stubEnv('VITE_GENERATE_INSIGHTS_URL', '');
      const mod = await import('../insights');
      insightsApi = mod.insightsApi;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('calls apiClient.post with /insights path', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      await insightsApi.generateInsights(samplePayload);

      expect(mockApiClientPost).toHaveBeenCalledTimes(1);
      expect(mockApiClientPost.mock.calls[0][0]).toBe('/insights');
    });

    it('passes the correct payload to apiClient', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      await insightsApi.generateInsights(samplePayload);

      expect(mockApiClientPost.mock.calls[0][1]).toEqual(samplePayload);
    });

    it('uses a 90-second timeout on apiClient fallback', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      await insightsApi.generateInsights(samplePayload);

      const config = mockApiClientPost.mock.calls[0][2];
      expect(config.timeout).toBe(90_000);
    });

    it('does not call axios.post when falling back', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      await insightsApi.generateInsights(samplePayload);

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns the response directly from apiClient', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      const result = await insightsApi.generateInsights(samplePayload);

      expect(result).toEqual(sampleInsightsResponse);
    });

    it('propagates errors from apiClient', async () => {
      mockApiClientPost.mockRejectedValueOnce(new Error('Gateway timeout'));

      await expect(
        insightsApi.generateInsights(samplePayload),
      ).rejects.toThrow('Gateway timeout');
    });

    it('sends payload without optional accountId via fallback', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      const minimalPayload = { startDate: '2026-04-01', endDate: '2026-04-17' };
      await insightsApi.generateInsights(minimalPayload);

      expect(mockApiClientPost.mock.calls[0][1]).toEqual(minimalPayload);
    });
  });

  // -----------------------------------------------------------------------
  // Undefined env var (VITE_GENERATE_INSIGHTS_URL not defined at all)
  // -----------------------------------------------------------------------
  describe('when VITE_GENERATE_INSIGHTS_URL is undefined', () => {
    let insightsApi: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      storage.clear();
      mockAxiosPost.mockReset();
      mockApiClientPost.mockReset();

      vi.resetModules();
      // Do not stub the env var — leave it undefined
      vi.stubEnv('VITE_GENERATE_INSIGHTS_URL', '');
      const mod = await import('../insights');
      insightsApi = mod.insightsApi;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('falls back to apiClient when env var is empty string', async () => {
      mockApiClientPost.mockResolvedValueOnce(sampleInsightsResponse);

      await insightsApi.generateInsights(samplePayload);

      expect(mockApiClientPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });
});
