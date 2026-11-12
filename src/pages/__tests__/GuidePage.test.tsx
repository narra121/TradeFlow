import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import { GuidePage } from '../GuidePage';
import { GUIDE_ALIASES } from '@/content/guideAnchors';

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
});

const SECTION_IDS = ['getting-started', 'dashboard', 'adding-trades', 'importing-trades', 'trade-log', 'analytics', 'insights', 'goals-rules', 'accounts', 'settings'];

describe('GuidePage', () => {
  it('has one h1 and the public frame with Log in and Start free', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'How to use TradeQut' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TradeQut home' })).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: 'Start free' }).some((l) => l.getAttribute('href') === '/signup')).toBe(true);
  });

  it('has one section per topic, each with an h2, and a contents list that points at them', () => {
    const { container } = renderWithProviders(<GuidePage />);
    for (const id of SECTION_IDS) {
      const section = container.querySelector(`section#${id}`);
      expect(section, id).not.toBeNull();
      expect(section!.querySelector('h2'), id).not.toBeNull();
    }
    const toc = screen.getAllByRole('navigation', { name: 'Guide navigation' })[0];
    expect(within(toc).getAllByRole('button')).toHaveLength(SECTION_IDS.length);
  });

  it('answers to every alias anchor with an element in the document', () => {
    const { container } = renderWithProviders(<GuidePage />);
    for (const [section, aliases] of Object.entries(GUIDE_ALIASES)) {
      expect(SECTION_IDS).toContain(section);
      for (const alias of aliases) expect(container.querySelector(`[id="${alias}"]`), alias).not.toBeNull();
    }
  });

  it('describes the current interface: trade pane, Import page, Plan & billing, no modals', () => {
    const { container } = renderWithProviders(<GuidePage />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/New trade pane/);
    expect(text).toMatch(/Download the CSV template/);
    expect(text).toMatch(/Plan & billing/);
    expect(text).not.toMatch(/modal|earlier version of the interface|under 2 minutes|free forever/i);
  });

  it('states the trial and plan limits from product facts, not invented ones', () => {
    renderWithProviders(<GuidePage />);
    expect(screen.getByText(/14-day Pro trial and no card/)).toBeInTheDocument();
    expect(screen.getByText(/Free plan keeps two accounts/)).toBeInTheDocument();
  });

  it('opens a screenshot from a real button into a dialog with a close button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GuidePage />);
    await user.click(screen.getAllByRole('button', { name: /Enlarge screenshot/ })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Close screenshot' })).toBeInTheDocument();
  });

  it('every screenshot has alt text and an existing file in public/guide', () => {
    const { container } = renderWithProviders(<GuidePage />);
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(14);
    for (const img of imgs) {
      expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(10);
      const src = img.getAttribute('src')!;
      expect(src.startsWith('/guide/'), src).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', src)), src).toBe(true);
    }
  });

  it('observes the sections for the active contents entry', () => {
    renderWithProviders(<GuidePage />);
    expect(vi.mocked(globalThis.IntersectionObserver)).toHaveBeenCalled();
  });
});
