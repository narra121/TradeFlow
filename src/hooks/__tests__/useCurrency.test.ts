import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrency } from '../useCurrency';

describe('useCurrency', () => {
  const mockFetch = vi.fn();
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};

    // Mock fetch
    global.fetch = mockFetch;

    // Mock AbortSignal.timeout — not available in all test environments (e.g. older jsdom/Node)
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);

    // Mock localStorage
    vi.spyOn(localStorage, 'getItem').mockImplementation(
      (key: string) => mockStorage[key] || null
    );
    vi.spyOn(localStorage, 'setItem').mockImplementation(
      (key: string, val: string) => {
        mockStorage[key] = val;
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'INR' when IP is from India", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'IN' }),
    });

    const { result } = renderHook(() => useCurrency());

    await waitFor(() => {
      expect(result.current.currency).toBe('INR');
    });
  });

  it("returns 'USD' when IP is from US", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'US' }),
    });

    const { result } = renderHook(() => useCurrency());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('USD');
  });

  it("returns 'USD' when API fails (fallback)", async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCurrency());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('USD');
  });

  it('uses cached value from localStorage when fresh', async () => {
    const cachedEntry = {
      currency: 'INR',
      timestamp: Date.now() - 1000, // 1 second ago — well within 7-day window
    };
    mockStorage['tradequt_detected_currency'] = JSON.stringify(cachedEntry);

    const { result } = renderHook(() => useCurrency());

    // Should use cache immediately without calling fetch
    expect(result.current.currency).toBe('INR');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls API when cache is expired (>7 days)', async () => {
    const expiredEntry = {
      currency: 'INR',
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
    };
    mockStorage['tradequt_detected_currency'] = JSON.stringify(expiredEntry);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'US' }),
    });

    const { result } = renderHook(() => useCurrency());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ipapi.co/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.currency).toBe('USD');
  });

  it('sets loading=true during detection', async () => {
    let resolveFetch: (value: any) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useCurrency());

    // loading should be true while detecting
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve fetch
    resolveFetch!({
      ok: true,
      json: async () => ({ country_code: 'IN' }),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('INR');
  });
});
