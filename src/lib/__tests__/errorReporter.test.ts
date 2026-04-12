import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original fetch before our module patches it
const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, clone: () => ({ text: () => Promise.resolve('{}') }) });
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => storage.set(key, val)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
});

// Mock navigator and screen
vi.stubGlobal('navigator', { userAgent: 'test-agent', language: 'en', platform: 'test' });
vi.stubGlobal('screen', { width: 1920, height: 1080 });

vi.stubEnv('VITE_API_URL', 'https://api.test.com/v1');

describe('errorReporter', () => {
  let initErrorReporter: () => void;
  let reportReactError: (error: Error, info: { componentStack?: string }) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage.clear();
    vi.resetModules();

    const mod = await import('../errorReporter');
    initErrorReporter = mod.initErrorReporter;
    reportReactError = mod.reportReactError;
  });

  it('initErrorReporter patches console without breaking it', () => {
    const originalLog = console.log;
    initErrorReporter();
    // Console should still work
    expect(() => console.log('test')).not.toThrow();
    expect(() => console.error('test error')).not.toThrow();
    expect(() => console.warn('test warn')).not.toThrow();
  });

  it('reportReactError sends error report via fetch', async () => {
    initErrorReporter();
    const error = new Error('Test crash');
    error.stack = 'Error: Test crash\n    at Component.render';
    reportReactError(error, { componentStack: '\n    at MyComponent' });

    // Give fire-and-forget fetch a tick
    await new Promise(r => setTimeout(r, 10));

    // Find the error report fetch call (not the patched one)
    const reportCall = mockFetch.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCall).toBeDefined();

    const body = JSON.parse(reportCall![1].body);
    expect(body.error.message).toBe('Test crash');
    expect(body.error.type).toBe('react-render');
    expect(body.error.componentStack).toContain('MyComponent');
    expect(body.url).toBeDefined();
    expect(body.browser.userAgent).toBe('test-agent');
  });

  it('deduplicates identical errors within 60 seconds', async () => {
    initErrorReporter();
    const error = new Error('Duplicate error');
    error.stack = 'Error: Duplicate\n    at X';

    reportReactError(error, {});
    reportReactError(error, {}); // should be skipped

    await new Promise(r => setTimeout(r, 10));

    const reportCalls = mockFetch.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCalls.length).toBe(1);
  });

  it('includes userId from JWT when available', async () => {
    storage.set('idToken', `header.${btoa(JSON.stringify({ sub: 'user-123' }))}.sig`);
    initErrorReporter();
    reportReactError(new Error('test'), {});

    await new Promise(r => setTimeout(r, 10));

    const reportCall = mockFetch.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    const body = JSON.parse(reportCall![1].body);
    expect(body.userId).toBe('user-123');
  });

  it('uses keepalive: true for fire-and-forget', async () => {
    initErrorReporter();
    reportReactError(new Error('keepalive test'), {});

    await new Promise(r => setTimeout(r, 10));

    const reportCall = mockFetch.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCall![1].keepalive).toBe(true);
  });

  it('never throws even if fetch fails', () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    initErrorReporter();
    expect(() => reportReactError(new Error('test'), {})).not.toThrow();
  });
});
