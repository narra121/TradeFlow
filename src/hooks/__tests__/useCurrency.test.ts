import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const CACHE_KEY = 'tradequt_detected_currency';

describe('useCurrency', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem(CACHE_KEY);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.removeItem(CACHE_KEY);
  });

  async function loadHook() {
    const mod = await import('../useCurrency');
    return renderHook(() => mod.useCurrency());
  }

  it("returns 'INR' when IP is from India", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'IN' }),
    });

    const { result } = await loadHook();

    await waitFor(() => {
      expect(result.current.currency).toBe('INR');
    });
  });

  it("returns 'USD' when IP is from US", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'US' }),
    });

    const { result } = await loadHook();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('USD');
  });

  it("returns 'USD' when API fails (fallback)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = await loadHook();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('USD');
  });

  it('uses cached value from localStorage when fresh', async () => {
    const cachedEntry = {
      currency: 'INR',
      timestamp: Date.now() - 1000,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedEntry));

    globalThis.fetch = vi.fn();

    const { result } = await loadHook();

    expect(result.current.currency).toBe('INR');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('calls API when cache is expired (>7 days)', async () => {
    const expiredEntry = {
      currency: 'INR',
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(expiredEntry));

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'US' }),
    });

    const { result } = await loadHook();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(result.current.currency).toBe('USD');
  });

  it('sets loading=true during detection', async () => {
    let resolveFetch!: (value: any) => void;
    globalThis.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = await loadHook();

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ country_code: 'IN' }),
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currency).toBe('INR');
  });
});
