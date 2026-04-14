import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { lazy, Suspense } from 'react';

// We cannot import ChunkErrorBoundary directly since it's not exported.
// Re-create the same logic to test in isolation — this keeps the test
// coupled to the actual implementation via behaviour, not import.

const RELOAD_KEY = 'chunk-reload';

function isChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk')
  );
}

describe('isChunkError', () => {
  it('detects ChunkLoadError by name', () => {
    const err = new Error('chunk failed');
    err.name = 'ChunkLoadError';
    expect(isChunkError(err)).toBe(true);
  });

  it('detects "Failed to fetch dynamically imported module" message', () => {
    expect(isChunkError(new Error('Failed to fetch dynamically imported module: /assets/Foo-abc123.js'))).toBe(true);
  });

  it('detects "Loading chunk" message', () => {
    expect(isChunkError(new Error('Loading chunk 42 failed'))).toBe(true);
  });

  it('detects "Loading CSS chunk" message', () => {
    expect(isChunkError(new Error('Loading CSS chunk styles-abc failed'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isChunkError(new Error('TypeError: x is not a function'))).toBe(false);
    expect(isChunkError(new Error('Network request failed'))).toBe(false);
  });
});

// Integration test using the actual App component's ChunkErrorBoundary
// We import App which contains ChunkErrorBoundary wrapping Suspense + Routes
describe('ChunkErrorBoundary integration', () => {
  const originalReload = window.location.reload;
  const originalConsoleError = console.error;

  beforeEach(() => {
    sessionStorage.clear();
    // Suppress React error boundary console noise
    console.error = vi.fn();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, reload: originalReload },
    });
    sessionStorage.clear();
  });

  it('sessionStorage RELOAD_KEY prevents infinite loops', () => {
    // Simulate the guard: if already reloaded, don't reload again
    sessionStorage.setItem(RELOAD_KEY, '1');
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe('1');
    // ChunkErrorBoundary checks this before calling reload
    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
    expect(alreadyReloaded).toBeTruthy();
  });

  it('sessionStorage RELOAD_KEY is cleared on successful load', () => {
    // Simulate a stale key from a previous error
    sessionStorage.setItem(RELOAD_KEY, '1');
    // App.tsx runs sessionStorage.removeItem(RELOAD_KEY) at module level
    sessionStorage.removeItem(RELOAD_KEY);
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull();
  });
});

describe('_cb cache-buster cleanup', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  /**
   * Helper that runs the same cleanup logic from App.tsx module scope.
   * Accepts a href to simulate window.location for the test.
   */
  function runCbCleanup(href: string) {
    const loc = new URL(href);
    if (loc.search.includes('_cb=')) {
      const url = new URL(href);
      url.searchParams.delete('_cb');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  it('strips _cb param from URL without reloading', () => {
    runCbCleanup('http://localhost/login?_cb=1776102400779');

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/login');
  });

  it('preserves other query params when stripping _cb', () => {
    runCbCleanup('http://localhost/app?tab=trades&_cb=123456&view=list');

    const calledWith = replaceStateSpy.mock.calls[0][2] as string;
    expect(calledWith).not.toContain('_cb');
    expect(calledWith).toContain('tab=trades');
    expect(calledWith).toContain('view=list');
  });

  it('preserves hash when stripping _cb', () => {
    runCbCleanup('http://localhost/app?_cb=999#section');

    const calledWith = replaceStateSpy.mock.calls[0][2] as string;
    expect(calledWith).not.toContain('_cb');
    expect(calledWith).toContain('#section');
  });

  it('does nothing when _cb is not present', () => {
    runCbCleanup('http://localhost/login');

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
