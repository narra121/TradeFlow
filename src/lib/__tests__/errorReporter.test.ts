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
  get length() { return storage.size; },
  key: (i: number) => [...storage.keys()][i] ?? null,
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
      (call) => typeof call[0] === 'string' && call[0].includes('/errors/report')
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
      (call) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCalls.length).toBe(1);
  });

  it('names the user only through the Authorization header, never in the body', async () => {
    const idToken = `header.${btoa(JSON.stringify({ sub: 'user-123' }))}.sig`;
    storage.set('CognitoIdentityServiceProvider.client.LastAuthUser', 'user-123');
    storage.set('CognitoIdentityServiceProvider.client.user-123.accessToken', 'a.b.c');
    storage.set('CognitoIdentityServiceProvider.client.user-123.idToken', idToken);
    initErrorReporter();
    reportReactError(new Error('test'), {});

    await new Promise(r => setTimeout(r, 10));

    const reportCall = mockFetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCall![1].headers.Authorization).toBe(`Bearer ${idToken}`);
    expect(JSON.parse(reportCall![1].body)).not.toHaveProperty('userId');
  });

  it('uses keepalive: true for fire-and-forget', async () => {
    initErrorReporter();
    reportReactError(new Error('keepalive test'), {});

    await new Promise(r => setTimeout(r, 10));

    const reportCall = mockFetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    expect(reportCall![1].keepalive).toBe(true);
  });

  it('never throws even if fetch fails', () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    initErrorReporter();
    expect(() => reportReactError(new Error('test'), {})).not.toThrow();
  });

  describe('report volume', () => {
    const reportCalls = () => mockFetch.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('/errors/report')
    );
    const flush = () => new Promise(r => setTimeout(r, 10));

    it('treats errors that differ only by an id or number as one', async () => {
      initErrorReporter();
      reportReactError(new Error('Trade 101 failed'), {});
      reportReactError(new Error('Trade 102 failed'), {});
      reportReactError(new Error('Trade 3f2b9c1e-aaaa-4bbb-8ccc-0123456789ab failed'), {});
      reportReactError(new Error('Account deleted'), {});
      await flush();

      expect(reportCalls().length).toBe(2);
    });

    it('stops after five reports in one session', async () => {
      initErrorReporter();
      for (const name of ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf']) {
        reportReactError(new Error(`${name} broke`), {});
      }
      await flush();

      expect(reportCalls().length).toBe(5);
    });

    it('stops sending after the backend answers 429', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
      initErrorReporter();
      reportReactError(new Error('first problem'), {});
      await flush();
      reportReactError(new Error('second problem'), {});
      await flush();

      expect(reportCalls().length).toBe(1);
    });
  });

  describe('API call capture', () => {
    const encoder = new TextEncoder();
    const API = 'https://api.test.com/v1';

    function openStream() {
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
      return { stream, controller };
    }

    async function lastReport() {
      reportReactError(new Error('capture check'), {});
      await new Promise(r => setTimeout(r, 10));
      const call = mockFetch.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('/errors/report')
      ).at(-1);
      return JSON.parse(call![1].body);
    }

    beforeEach(() => {
      // Earlier tests left their patched fetch on window; the call under test goes straight to the mock.
      window.fetch = mockFetch as unknown as typeof window.fetch;
      initErrorReporter();
    });

    afterEach(() => {
      window.history.pushState({}, '', '/');
    });

    it('returns a streamed response before its body ends and does not tee it', async () => {
      const { stream, controller } = openStream();
      const res = new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
      const cloneSpy = vi.spyOn(res, 'clone');
      mockFetch.mockResolvedValueOnce(res);

      // The stream stays open until the assertions below: a patched fetch that waited for the body would never resolve.
      const response = await window.fetch(`${API}/chat/sessions/s1/stream`);
      controller.enqueue(encoder.encode('data: hello\n\n'));
      const first = await response.body!.getReader().read();

      expect(new TextDecoder().decode(first.value)).toBe('data: hello\n\n');
      expect(cloneSpy).not.toHaveBeenCalled();
      controller.close();
    });

    it('returns a failed JSON response before its body ends, then adds the redacted body', async () => {
      const { stream, controller } = openStream();
      mockFetch.mockResolvedValueOnce(new Response(stream, { status: 400, headers: { 'content-type': 'application/json' } }));

      const response = await window.fetch(`${API}/user/profile`, { method: 'PUT' });
      expect(response.status).toBe(400);
      controller.enqueue(encoder.encode(JSON.stringify({ message: 'Name is too long', token: 'secret-token-value' })));
      controller.close();
      await new Promise(r => setTimeout(r, 10));

      const [call] = (await lastReport()).recentApiCalls;
      expect(call.status).toBe(400);
      expect(call.responseBody).toContain('Name is too long');
      expect(call.responseBody).not.toContain('secret-token-value');
    });

    it('keeps no body for a 2xx response', async () => {
      const res = new Response(JSON.stringify({ email: 'me@example.com', notes: 'private' }), { status: 200, headers: { 'content-type': 'application/json' } });
      const cloneSpy = vi.spyOn(res, 'clone');
      mockFetch.mockResolvedValueOnce(res);

      await window.fetch(`${API}/user/profile`);
      const [call] = (await lastReport()).recentApiCalls;

      expect(call.status).toBe(200);
      expect(call.responseBody).toBeNull();
      expect(cloneSpy).not.toHaveBeenCalled();
    });

    it('keeps no body for a failed response that is not JSON', async () => {
      const res = new Response('<html>Bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } });
      const cloneSpy = vi.spyOn(res, 'clone');
      mockFetch.mockResolvedValueOnce(res);

      await window.fetch(`${API}/trades`);
      const [call] = (await lastReport()).recentApiCalls;

      expect(call.status).toBe(502);
      expect(call.responseBody).toBeNull();
      expect(cloneSpy).not.toHaveBeenCalled();
    });

    it('strips query strings from the call url, the curl and the page url', async () => {
      window.history.pushState({}, '', '/auth/callback?code=abc123&state=xyz#frag');
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await window.fetch(`${API}/billing/verify?session_id=cs_live_secret`);
      const report = await lastReport();

      expect(report.recentApiCalls[0].url).toBe(`${API}/billing/verify`);
      expect(report.recentApiCalls[0].curl).toContain(`'${API}/billing/verify'`);
      expect(report.recentApiCalls[0].curl).not.toContain('cs_live_secret');
      expect(report.url).toMatch(/\/auth\/callback$/);
    });

    it('redacts a request body after the scan window, so a secret that crosses the 2,000-character cut is not left half open', async () => {
      const requestBody = JSON.stringify({ notes: 'x'.repeat(1960), password: 'S'.repeat(100) });
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await window.fetch(`${API}/user/preferences`, { method: 'PUT', body: requestBody });
      const [call] = (await lastReport()).recentApiCalls;

      expect(call.requestBody.length).toBeLessThanOrEqual(2003);
      expect(call.requestBody).not.toContain('SSSS');
    });
  });
});
