import { describe, it, expect, vi, afterEach } from 'vitest';
import { browserZone, canonicalZone, zoneList } from '../timeZones';

afterEach(() => vi.restoreAllMocks());

describe('time zones', () => {
  it('maps the legacy names a browser may report to the current IANA names', () => {
    expect(canonicalZone('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(canonicalZone('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(canonicalZone('Europe/Paris')).toBe('Europe/Paris');
  });

  it('lists the browser zone once, under its current name, first', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Asia/Calcutta' } as Intl.ResolvedDateTimeFormatOptions);
    expect(browserZone()).toBe('Asia/Kolkata');
    const list = zoneList('');
    expect(list.filter((z) => z === 'Asia/Kolkata' || z === 'Asia/Calcutta')).toEqual(['Asia/Kolkata']);
    expect(list[0]).toBe('Asia/Kolkata');
    expect(new Set(list).size).toBe(list.length);
  });

  it('keeps a stored zone selectable even if the browser list lacks it', () => {
    expect(zoneList('Pacific/Chatham')).toContain('Pacific/Chatham');
  });
});
