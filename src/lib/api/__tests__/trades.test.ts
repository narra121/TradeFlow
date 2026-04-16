import { describe, it, expect, vi, beforeEach } from 'vitest';

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
// Test suite
// ---------------------------------------------------------------------------
describe('tradesApi.extractTrades', () => {
  // -----------------------------------------------------------------------
  // Function URL path (VITE_EXTRACT_TRADES_URL is set)
  // -----------------------------------------------------------------------
  describe('when VITE_EXTRACT_TRADES_URL is set (Function URL path)', () => {
    let tradesApi: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      storage.clear();
      mockAxiosPost.mockReset();
      mockApiClientPost.mockReset();

      vi.resetModules();
      vi.stubEnv('VITE_EXTRACT_TRADES_URL', 'https://lambda.example.com/extract');
      const mod = await import('../trades');
      tradesApi = mod.tradesApi;
    });

    it('calls axios.post with the Function URL', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [{ symbol: 'AAPL' }] } });

      const payload = { images: ['base64-img-1'] };
      await tradesApi.extractTrades(payload);

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockAxiosPost.mock.calls[0][0]).toBe('https://lambda.example.com/extract');
      expect(mockAxiosPost.mock.calls[0][1]).toEqual(payload);
    });

    it('sets a 90-second timeout', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      await tradesApi.extractTrades({ images: ['img'] });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.timeout).toBe(90_000);
    });

    it('attaches the Authorization header when idToken exists', async () => {
      storage.set('idToken', 'my-auth-token');
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      await tradesApi.extractTrades({ images: ['img'] });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBe('Bearer my-auth-token');
    });

    it('omits Authorization header when no idToken exists', async () => {
      // storage has no idToken
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      await tradesApi.extractTrades({ images: ['img'] });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('sets Content-Type to application/json', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      await tradesApi.extractTrades({ textContent: 'some text' });

      const config = mockAxiosPost.mock.calls[0][2];
      expect(config.headers['Content-Type']).toBe('application/json');
    });

    it('unwraps body.data envelope when present', async () => {
      const innerData = { items: [{ symbol: 'TSLA', pnl: 100 }], error: undefined };
      mockAxiosPost.mockResolvedValueOnce({ data: { data: innerData } });

      const result = await tradesApi.extractTrades({ images: ['img'] });

      expect(result).toEqual(innerData);
    });

    it('returns body directly when no data envelope is present', async () => {
      const flatBody = { items: [{ symbol: 'MSFT' }] };
      mockAxiosPost.mockResolvedValueOnce({ data: flatBody });

      const result = await tradesApi.extractTrades({ images: ['img'] });

      expect(result).toEqual(flatBody);
    });

    it('returns body when body.data is explicitly undefined', async () => {
      const body = { items: [], someField: 'val' };
      mockAxiosPost.mockResolvedValueOnce({ data: body });

      const result = await tradesApi.extractTrades({ images: ['img'] });

      expect(result).toEqual(body);
    });

    it('does not call apiClient when Function URL is configured', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      await tradesApi.extractTrades({ images: ['img'] });

      expect(mockApiClientPost).not.toHaveBeenCalled();
    });

    it('supports textContent payload', async () => {
      mockAxiosPost.mockResolvedValueOnce({ data: { items: [] } });

      const payload = { textContent: 'Buy AAPL at 150' };
      await tradesApi.extractTrades(payload);

      expect(mockAxiosPost.mock.calls[0][1]).toEqual(payload);
    });

    it('propagates errors from axios', async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error('Lambda timeout'));

      await expect(
        tradesApi.extractTrades({ images: ['img'] }),
      ).rejects.toThrow('Lambda timeout');
    });
  });

  // -----------------------------------------------------------------------
  // API Gateway fallback (VITE_EXTRACT_TRADES_URL is NOT set)
  // -----------------------------------------------------------------------
  describe('when VITE_EXTRACT_TRADES_URL is not set (API Gateway fallback)', () => {
    let tradesApi: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      storage.clear();
      mockAxiosPost.mockReset();
      mockApiClientPost.mockReset();

      vi.resetModules();
      vi.stubEnv('VITE_EXTRACT_TRADES_URL', '');
      const mod = await import('../trades');
      tradesApi = mod.tradesApi;
    });

    it('calls apiClient.post with /trades/extract path', async () => {
      mockApiClientPost.mockResolvedValueOnce({ items: [] });

      const payload = { images: ['img-data'] };
      await tradesApi.extractTrades(payload);

      expect(mockApiClientPost).toHaveBeenCalledTimes(1);
      expect(mockApiClientPost.mock.calls[0][0]).toBe('/trades/extract');
      expect(mockApiClientPost.mock.calls[0][1]).toEqual(payload);
    });

    it('passes 90-second timeout to apiClient', async () => {
      mockApiClientPost.mockResolvedValueOnce({ items: [] });

      await tradesApi.extractTrades({ images: ['img'] });

      const config = mockApiClientPost.mock.calls[0][2];
      expect(config.timeout).toBe(90_000);
    });

    it('does not call axios.post', async () => {
      mockApiClientPost.mockResolvedValueOnce({ items: [] });

      await tradesApi.extractTrades({ images: ['img'] });

      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns the response directly from apiClient', async () => {
      const response = { items: [{ symbol: 'GOOG', pnl: 200 }] };
      mockApiClientPost.mockResolvedValueOnce(response);

      const result = await tradesApi.extractTrades({ images: ['img'] });

      expect(result).toEqual(response);
    });

    it('supports textContent payload via API Gateway', async () => {
      mockApiClientPost.mockResolvedValueOnce({ items: [] });

      const payload = { textContent: 'Sell TSLA at 800' };
      await tradesApi.extractTrades(payload);

      expect(mockApiClientPost.mock.calls[0][1]).toEqual(payload);
    });

    it('propagates errors from apiClient', async () => {
      mockApiClientPost.mockRejectedValueOnce(new Error('Gateway timeout'));

      await expect(
        tradesApi.extractTrades({ images: ['img'] }),
      ).rejects.toThrow('Gateway timeout');
    });
  });
});
