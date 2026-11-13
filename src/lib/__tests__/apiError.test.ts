import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectionMessage, readApiError, readResponseError } from '../apiError';

const envelope = (message: string, errorCode: string, extra: Record<string, unknown> = {}) => ({ success: false, message, errorCode, errorMessage: message, ...extra });
const HTML = '<html><body><h1>502 Bad Gateway</h1></body></html>';

afterEach(() => vi.restoreAllMocks());

describe('readApiError: an HTTP response shows the API message', () => {
  it.each([
    [400, 'VALIDATION_ERROR', 'A trade can have at most 6 images'],
    [401, 'UNAUTHORIZED', 'Your session has ended. Please log in again.'],
    [403, 'FORBIDDEN', 'You do not have access to this account.'],
    [404, 'NOT_FOUND', 'Trade not found'],
    [409, 'CONFLICT', 'That account name is already in use.'],
    [422, 'VALIDATION_ERROR', 'Entry price must be a number'],
    [500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'],
  ])('%i keeps the message and code of the envelope', (status, code, message) => {
    expect(readApiError({ status, data: envelope(message, code) })).toEqual({ message, code, status, kind: 'http' });
  });

  it('reads the owner case: 400 with more than 6 images', () => {
    const data = { success: false, message: 'A trade can have at most 6 images', errorCode: 'VALIDATION_ERROR', errorMessage: 'A trade can have at most 6 images' };
    const info = readApiError({ status: 400, data }, 'Could not save the trade.');
    expect(info.message).toBe('A trade can have at most 6 images');
    expect(info.kind).toBe('http');
    expect(info.message).not.toMatch(/connection|internet|offline/i);
  });

  it('429 carries retryAfter from error.retryAfter', () => {
    const data = envelope('Too many attempts', 'RATE_LIMITED', { error: { code: 'RATE_LIMITED', retryAfter: 286 } });
    expect(readApiError({ status: 429, data })).toEqual({ message: 'Too many attempts', code: 'RATE_LIMITED', status: 429, kind: 'http', retryAfter: 286 });
  });

  it('reads retryAfter from the older shapes during the transition and rounds it up', () => {
    expect(readApiError({ status: 429, data: { message: 'x', errors: [{ retryAfter: 41.2 }] } }).retryAfter).toBe(42);
    expect(readApiError({ status: 429, data: { message: 'x', error: { details: { retryAfter: 9 } } } }).retryAfter).toBe(9);
    expect(readApiError({ status: 429, data: { message: 'x', error: { retryAfter: 0 } } }).retryAfter).toBeUndefined();
  });

  it('shows the first field message of a validation error through the top-level message', () => {
    const data = envelope('Side is required (and 8 more)', 'VALIDATION_ERROR', { error: { code: 'VALIDATION_ERROR', fields: [{ field: 'side', message: 'Side is required' }] } });
    expect(readApiError({ status: 400, data }).message).toBe('Side is required (and 8 more)');
  });

  it.each([
    ['errorMessage only', { errorMessage: 'Only errorMessage' }, 'Only errorMessage'],
    ['message only', { message: 'Forbidden' }, 'Forbidden'],
    ['error as text', { error: 'Image not found' }, 'Image not found'],
    ['error object with message', { error: { code: 'X', message: 'Nested message' } }, 'Nested message'],
    ['webhook shape', { data: null, error: { code: 'MISSING_SIGNATURE', message: 'Missing signature' }, meta: null }, 'Missing signature'],
    ['errors array', { errors: [{ message: 'First problem' }] }, 'First problem'],
  ])('reads the message of the %s variant', (_name, data, expected) => {
    expect(readApiError({ status: 400, data }).message).toBe(expected);
  });

  it('reads an axios error and a plain Error with a status', () => {
    expect(readApiError({ response: { status: 402, data: { error: { code: 'QUOTA_EXCEEDED', message: 'Limit' } } } })).toMatchObject({ code: 'QUOTA_EXCEEDED', message: 'Limit', status: 402, kind: 'http' });
    expect(readApiError(Object.assign(new Error('Request failed (418)'), { status: 418 })).message).toBe('Request failed (418)');
  });

  it('prefers the body over the fallback and the fallback over nothing', () => {
    expect(readApiError({ status: 400, data: envelope('Body wins', 'X') }, 'Fallback').message).toBe('Body wins');
    expect(readApiError({ status: 400, data: {} }, 'Fallback').message).toBe('Fallback');
    expect(readApiError({ status: 400 }).message).toBe('Something went wrong');
  });
});

describe('readApiError: bodies that are not the envelope', () => {
  it('shows a short plain-text body, ignores HTML and long text, and falls back on an empty body', () => {
    expect(readApiError({ status: 400, data: 'Bad input' }).message).toBe('Bad input');
    expect(readApiError({ status: 500, data: HTML }, 'Could not save.').message).toBe('Could not save.');
    expect(readApiError({ status: 500, data: 'x'.repeat(500) }, 'Could not save.').message).toBe('Could not save.');
    expect(readApiError({ status: 500, data: '' }, 'Could not save.').message).toBe('Could not save.');
    expect(readApiError({ status: 500, data: undefined }, 'Could not save.').message).toBe('Could not save.');
  });

  it.each([
    [413, /too large/i],
    [429, /Too many requests/],
    [502, /temporarily unavailable/],
    [503, /temporarily unavailable/],
    [504, /took too long/],
  ])('%i from a gateway reads as its status message, never as connection wording', (status, expected) => {
    for (const data of [HTML, 'Bad Gateway', undefined]) {
      const info = readApiError({ status, data }, 'Could not save.');
      expect(info.message).toMatch(expected);
      expect(info.kind).toBe('http');
      expect(info.message).not.toMatch(/internet connection|offline/i);
    }
  });

  it('keeps the API message over the gateway message when the gateway forwarded JSON', () => {
    expect(readApiError({ status: 503, data: envelope('Billing is paused for maintenance.', 'SERVICE_UNAVAILABLE') }).message).toBe('Billing is paused for maintenance.');
  });

  it('reads an RTK PARSING_ERROR through its original status', () => {
    expect(readApiError({ status: 'PARSING_ERROR', originalStatus: 502, data: HTML, error: 'SyntaxError: Unexpected token <' }).message).toMatch(/temporarily unavailable/);
    expect(readApiError({ status: 'PARSING_ERROR', originalStatus: 502, data: HTML }).status).toBe(502);
  });
});

describe('readApiError: only a failure without an HTTP response reads as a connection problem', () => {
  it('network failure from RTK, axios and fetch', () => {
    for (const err of [{ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }, { code: 'ERR_NETWORK', message: 'Network Error' }, new TypeError('Failed to fetch'), new TypeError('Load failed')]) {
      const info = readApiError(err, 'Could not save.');
      expect(info.kind).toBe('network');
      expect(info.message).toBe(connectionMessage('network'));
      expect(info.message).toMatch(/internet connection/i);
    }
  });

  it('timeout from RTK and axios', () => {
    for (const err of [{ status: 'TIMEOUT_ERROR' }, { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }]) {
      const info = readApiError(err, 'Could not save.');
      expect(info.kind).toBe('timeout');
      expect(info.message).toBe(connectionMessage('timeout'));
    }
  });

  it('says offline when the browser reports it', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    expect(readApiError({ status: 'FETCH_ERROR' }).message).toMatch(/offline/i);
    expect(connectionMessage('timeout')).toMatch(/offline/i);
  });

  it('is online wording otherwise', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    expect(connectionMessage('network')).not.toMatch(/offline/i);
  });

  it('does not treat a TypeError from our own code, or an abort, as a connection problem', () => {
    expect(readApiError(new TypeError("Cannot read properties of undefined (reading 'x')")).kind).toBe('unknown');
    expect(readApiError(Object.assign(new Error('aborted'), { name: 'AbortError' })).kind).toBe('unknown');
  });

  it('falls back for unknown shapes', () => {
    expect(readApiError(undefined, 'nope')).toEqual({ message: 'nope', kind: 'unknown', code: undefined, status: undefined });
    expect(readApiError(42).message).toBe('Something went wrong');
    expect(readApiError(new Error('boom')).message).toBe('boom');
  });
});

describe('readResponseError', () => {
  it('reads the envelope of a failed fetch Response', async () => {
    const res = new Response(JSON.stringify(envelope('Image not found', 'NOT_FOUND')), { status: 404, headers: { 'content-type': 'application/json' } });
    expect(await readResponseError(res)).toMatchObject({ message: 'Image not found', code: 'NOT_FOUND', status: 404, kind: 'http' });
  });

  it('reads an HTML gateway page by its status and an empty body by the fallback', async () => {
    expect((await readResponseError(new Response(HTML, { status: 502 }))).message).toMatch(/temporarily unavailable/);
    expect((await readResponseError(new Response('', { status: 400 }), 'Try again.')).message).toBe('Try again.');
  });
});
