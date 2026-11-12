import { describe, expect, it } from 'vitest';
import { NOTE_MAX, isNotesUnavailable } from '../journalApi';

describe('journalApi', () => {
  it('limits a note part to 2,000 characters, the backend limit', () => {
    expect(NOTE_MAX).toBe(2000);
  });

  it('treats a missing or forbidden notes route as "not available", and nothing else', () => {
    expect(isNotesUnavailable({ status: 404 })).toBe(true);
    expect(isNotesUnavailable({ status: 403 })).toBe(true);
    expect(isNotesUnavailable({ status: 500 })).toBe(false);
    expect(isNotesUnavailable(undefined)).toBe(false);
  });
});
