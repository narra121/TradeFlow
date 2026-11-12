import { describe, expect, it } from 'vitest';
import { incidentVisible, parseIncident } from '../incident';

const base = { id: 'i1', level: 'investigating', message: 'Imports are slow' };

describe('parseIncident', () => {
  it('treats an empty object as nothing to show', () => {
    expect(parseIncident({})).toBeNull();
    expect(parseIncident(null)).toBeNull();
  });

  it('rejects an unknown level or a missing message', () => {
    expect(parseIncident({ ...base, level: 'panic' })).toBeNull();
    expect(parseIncident({ ...base, message: '' })).toBeNull();
  });

  it('keeps the optional link and window', () => {
    expect(parseIncident({ ...base, link: 'https://x.test', until: '2026-11-12T00:00:00Z' })).toMatchObject({ link: 'https://x.test', until: '2026-11-12T00:00:00Z' });
  });
});

describe('incidentVisible', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const inc = parseIncident({ ...base, from: '2026-11-11T10:00:00Z', until: '2026-11-11T14:00:00Z' });

  it('shows inside the window only', () => {
    expect(incidentVisible(inc, now, new Set())).toBe(true);
    expect(incidentVisible(inc, new Date('2026-11-11T09:00:00Z'), new Set())).toBe(false);
    expect(incidentVisible(inc, new Date('2026-11-11T14:00:00Z'), new Set())).toBe(false);
  });

  it('stays hidden once dismissed for that id', () => {
    expect(incidentVisible(inc, now, new Set(['i1']))).toBe(false);
    expect(incidentVisible(parseIncident({ ...base, id: 'i2' }), now, new Set(['i1']))).toBe(true);
  });
});
