import { describe, expect, it } from 'vitest';
import { readApiError } from '../apiError';

describe('readApiError', () => {
  it('reads an RTK Query error with a backend envelope', () => {
    expect(readApiError({ status: 403, data: { message: 'Verify your email', errorCode: 'EMAIL_NOT_VERIFIED' } })).toEqual({ message: 'Verify your email', code: 'EMAIL_NOT_VERIFIED', status: 403 });
  });

  it('reads a string body, an axios response and a plain Error', () => {
    expect(readApiError({ status: 'FETCH_ERROR', data: 'Network error. Please try again.' }).message).toBe('Network error. Please try again.');
    expect(readApiError({ response: { status: 402, data: { error: { code: 'QUOTA_EXCEEDED', message: 'Limit' } } } })).toMatchObject({ code: 'QUOTA_EXCEEDED', message: 'Limit', status: 402 });
    expect(readApiError(new Error('boom')).message).toBe('boom');
  });

  it('falls back for unknown shapes', () => {
    expect(readApiError(undefined, 'nope').message).toBe('nope');
    expect(readApiError(42).message).toBe('Something went wrong');
  });
});
