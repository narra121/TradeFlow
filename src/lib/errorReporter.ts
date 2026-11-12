/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { API_BASE_URL } from '@/lib/api/config';
import { decodeJwtPayload } from '@/lib/jwt';

const REPORT_URL = `${API_BASE_URL}/errors/report`;
const MAX_CONSOLE_LOGS = 50;
const MAX_API_CALLS = 20;
const MAX_PAYLOAD_BYTES = 200 * 1024; // 200KB
const KEEPALIVE_LIMIT_BYTES = 60 * 1024; // fetch keepalive bodies are capped at 64 KiB by browsers
const DEDUP_WINDOW_MS = 60000; // 60 seconds

// Keep reference to original fetch before patching
let originalFetch: typeof window.fetch;
let sessionStart: number;

// ─── Ring Buffers ───────────────────────────────────────

interface ConsoleLogEntry {
  level: string;
  message: string;
  timestamp: string;
}

interface ApiCallEntry {
  url: string;
  method: string;
  status: number;
  timestamp: string;
  requestBody: string | null;
  responseBody: string | null;
  durationMs: number;
  curl: string | null;
}

const consoleLogs: ConsoleLogEntry[] = [];
const apiCalls: ApiCallEntry[] = [];
const recentFingerprints = new Map<string, number>();

// ─── Redaction ──────────────────────────────────────────

const SENSITIVE_HEADERS = /^(authorization|cookie|set-cookie|x-api-key|x-amz-security-token)$/i;
const SENSITIVE_KEYS = 'IdToken|AccessToken|RefreshToken|id_token|access_token|refresh_token|token|password|currentPassword|newPassword|code';

/** Removes bearer tokens and token / password fields from anything that leaves the browser in an error report. */
export function redactSecrets(text: string): string;
export function redactSecrets(text: string | null): string | null;
export function redactSecrets(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(new RegExp(`("(?:${SENSITIVE_KEYS})"\\s*:\\s*)"[^"]*"`, 'g'), '$1"[redacted]"')
    .replace(new RegExp(`((?:${SENSITIVE_KEYS})=)[^&\\s"']+`, 'g'), '$1[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, '[redacted-jwt]');
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) out[k] = SENSITIVE_HEADERS.test(k) ? '[redacted]' : v;
  return out;
}

// ─── Safe Stringify ─────────────────────────────────────

function safeStringify(args: any[]): string {
  try {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'object') {
        try {
          const str = JSON.stringify(arg);
          return str.length > 200 ? str.slice(0, 200) + '...' : str;
        } catch { return '[Circular]'; }
      }
      const str = String(arg);
      return str.length > 200 ? str.slice(0, 200) + '...' : str;
    }).join(' ');
  } catch { return '[stringify failed]'; }
}

function pushToRing<T>(buffer: T[], entry: T, maxSize: number) {
  if (buffer.length >= maxSize) buffer.shift();
  buffer.push(entry);
}

// ─── Console Patching ───────────────────────────────────

function patchConsole() {
  const levels = ['log', 'warn', 'error', 'info'] as const;
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: any[]) => {
      original(...args);
      pushToRing(consoleLogs, {
        level,
        message: redactSecrets(safeStringify(args).slice(0, 1000)),
        timestamp: new Date().toISOString(),
      }, MAX_CONSOLE_LOGS);
    };
  }
}

// ─── Fetch Patching (capture ALL API calls) ─────────────

function truncate(str: string | null | undefined, max: number): string | null {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url || '';
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== 'string' && !(input instanceof URL) && input.method) return input.method.toUpperCase();
  return 'GET';
}

function extractHeaders(input: RequestInfo | URL, init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  const src = init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : null);
  if (src) {
    if (src instanceof Headers) {
      src.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(src)) {
      src.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, src);
    }
  }
  return redactHeaders(headers);
}

function extractBody(input: RequestInfo | URL, init?: RequestInit): string | null {
  const body = init?.body || (typeof input !== 'string' && !(input instanceof URL) ? input.body : null);
  if (!body) return null;
  if (typeof body === 'string') return truncate(redactSecrets(body), 2000);
  try { return truncate(redactSecrets(JSON.stringify(body)), 2000); } catch { return '[body]'; }
}

function buildCurlCommand(url: string, method: string, headers: Record<string, string>, body: string | null): string {
  let cmd = `curl -X ${method} '${url}'`;
  for (const [k, v] of Object.entries(headers)) {
    cmd += ` -H '${k}: ${v}'`;
  }
  if (body) {
    cmd += ` -d '${body.length > 500 ? body.slice(0, 500) + '...' : body}'`;
  }
  return cmd;
}

function patchFetch() {
  originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = extractUrl(input);

    // Skip our own error reporting endpoint to prevent recursion
    if (url.includes('/errors/report')) {
      return originalFetch(input, init);
    }

    // Skip non-API calls (images, scripts, etc.) — only capture JSON API calls
    const isApiCall = url.includes('/v1/') || url.includes('oauth2/token');
    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const method = extractMethod(input, init);
    const headers = extractHeaders(input, init);
    const requestBody = extractBody(input, init);
    const startTime = Date.now();

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - startTime;

      // Clone response to read body without consuming it
      let responseBody: string | null = null;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        responseBody = truncate(redactSecrets(text), 2000);
      } catch { /* ignore */ }

      pushToRing(apiCalls, {
        url: truncate(url, 500) || url,
        method,
        status: response.status,
        timestamp: new Date().toISOString(),
        requestBody,
        responseBody,
        durationMs,
        curl: buildCurlCommand(url, method, headers, requestBody),
      }, MAX_API_CALLS);

      return response;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      pushToRing(apiCalls, {
        url: truncate(url, 500) || url,
        method,
        status: 0,
        timestamp: new Date().toISOString(),
        requestBody,
        responseBody: err instanceof Error ? err.message : 'Network error',
        durationMs,
        curl: buildCurlCommand(url, method, headers, requestBody),
      }, MAX_API_CALLS);
      throw err;
    }
  };
}

// ─── Deduplication ──────────────────────────────────────

function getFingerprint(message: string, stack?: string | null): string {
  const firstLine = stack?.split('\n')[0] || '';
  return `${message}::${firstLine}`;
}

function isDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  // Prune old entries
  for (const [fp, ts] of recentFingerprints) {
    if (now - ts > DEDUP_WINDOW_MS) recentFingerprints.delete(fp);
  }
  if (recentFingerprints.has(fingerprint)) return true;
  recentFingerprints.set(fingerprint, now);
  return false;
}

// ─── Report Error ───────────────────────────────────────

interface ErrorData {
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  type: 'react-render' | 'unhandled-error' | 'unhandled-rejection' | 'manual';
}

function reportError(errorData: ErrorData) {
  try {
    const fingerprint = getFingerprint(errorData.message, errorData.stack);
    if (isDuplicate(fingerprint)) return;

    // Extract userId from JWT if available
    let userId: string | null = null;
    try {
      const token = localStorage.getItem('idToken');
      if (token) {
        userId = decodeJwtPayload(token)?.sub || null;
      }
    } catch { /* ignore */ }

    const payload = {
      error: {
        message: redactSecrets(errorData.message.slice(0, 2000)),
        stack: errorData.stack ? redactSecrets(errorData.stack.slice(0, 10000)) : null,
        componentStack: errorData.componentStack ? errorData.componentStack.slice(0, 5000) : null,
        type: errorData.type,
      },
      timestamp: new Date().toISOString(),
      url: window.location.href.slice(0, 2000),
      userId,
      browser: {
        userAgent: navigator.userAgent.slice(0, 500),
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
      },
      consoleLogs: [...consoleLogs],
      recentApiCalls: [...apiCalls],
      metadata: {
        sessionDuration: Math.round((Date.now() - sessionStart) / 1000),
      },
    };

    // Enforce size limit — truncate if needed
    let body = JSON.stringify(payload);
    if (body.length > MAX_PAYLOAD_BYTES) {
      // First truncate console logs
      payload.consoleLogs = payload.consoleLogs.slice(-20);
      body = JSON.stringify(payload);
    }
    if (body.length > MAX_PAYLOAD_BYTES) {
      // Then truncate API call response bodies
      payload.recentApiCalls = payload.recentApiCalls.map(call => ({
        ...call,
        responseBody: call.responseBody ? call.responseBody.slice(0, 500) : null,
        curl: null,
      }));
      body = JSON.stringify(payload);
    }

    if (body.length > KEEPALIVE_LIMIT_BYTES) {
      payload.consoleLogs = payload.consoleLogs.slice(-10);
      payload.recentApiCalls = payload.recentApiCalls.slice(-5).map((call) => ({ ...call, requestBody: null, responseBody: call.responseBody ? call.responseBody.slice(0, 300) : null, curl: null }));
      body = JSON.stringify(payload);
    }

    // Fire and forget — use original fetch with keepalive
    const token = localStorage.getItem('idToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    originalFetch(REPORT_URL, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }).catch(() => {}); // Swallow ALL errors
  } catch {
    // Never throw from the error reporter
  }
}

// ─── Public API ─────────────────────────────────────────

export function initErrorReporter() {
  sessionStart = Date.now();

  patchConsole();
  patchFetch();

  // Global error handler
  window.onerror = (message, _source, _lineno, _colno, error) => {
    reportError({
      message: String(message),
      stack: error?.stack || null,
      type: 'unhandled-error',
    });
  };

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    reportError({
      message: error?.message || String(error),
      stack: error?.stack || null,
      type: 'unhandled-rejection',
    });
  });
}

export function reportReactError(error: Error, errorInfo: { componentStack?: string }) {
  reportError({
    message: error.message,
    stack: error.stack || null,
    componentStack: errorInfo.componentStack || null,
    type: 'react-render',
  });
}
