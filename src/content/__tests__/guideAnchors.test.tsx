import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { GuidePage } from '@/pages/GuidePage';
import { GUIDE_ALIASES, GUIDE_ANCHORS, guideLink } from '../guideAnchors';
import { FOOTER_GROUPS } from '@/components/public/nav';

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
});

describe('guide anchors', () => {
  it('every anchor Help can link to exists on the guide page', () => {
    const { container } = renderWithProviders(<GuidePage />);
    for (const anchor of Object.values(GUIDE_ANCHORS)) {
      expect(container.querySelector(`[id="${anchor}"]`), anchor).not.toBeNull();
    }
  });

  it('every alias is unique and no alias shadows a section id', () => {
    const aliases = Object.values(GUIDE_ALIASES).flat();
    expect(new Set(aliases).size).toBe(aliases.length);
    for (const a of aliases) expect(Object.keys(GUIDE_ALIASES)).not.toContain(a);
  });

  it('every footer link into the guide points at an existing anchor', () => {
    const { container } = renderWithProviders(<GuidePage />);
    const links = FOOTER_GROUPS.flatMap((g) => g.links).filter((l) => l.to.startsWith('/guide#'));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(container.querySelector(`[id="${l.to.split('#')[1]}"]`), l.to).not.toBeNull();
  });

  it('builds the contextual link for an app page, falling back to the guide', () => {
    expect(guideLink('import')).toBe('/guide#import');
    expect(guideLink('nope')).toBe('/guide');
  });
});
