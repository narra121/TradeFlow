import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders, screen } from '@/test/test-utils';
import { BLOG_ARTICLES } from '../blog/articles';
import { COMPETITORS } from '../alternatives';
import { SEO_PAGES } from '../seo-pages';
import { PLAN_LIMITS } from '../product-facts';
import PricingPage from '@/pages/seo/PricingPage';
import TradingJournalIndiaPage from '@/pages/seo/TradingJournalIndiaPage';
import TraderSyncAlternativePage from '@/pages/seo/TraderSyncAlternativePage';
import { AboutPage } from '@/pages/AboutPage';

/** The India tax report is live for Pro (product-facts `PLAN_LIMITS`); no page may still call it planned. */
const TAX_PLANNED = /tax[^.]{0,80}\b(planned|not available yet)\b|\bplanned\b[^.]{0,80}tax report/i;

describe('every article', () => {
  it('has an answer-first summary and at least two FAQ items (GEO)', () => {
    for (const a of BLOG_ARTICLES) {
      expect(a.summary?.length ?? 0, a.slug).toBeGreaterThan(80);
      expect(a.faq?.length ?? 0, a.slug).toBeGreaterThanOrEqual(2);
      for (const f of a.faq ?? []) expect(f.question.endsWith('?'), `${a.slug}: ${f.question}`).toBe(true);
    }
  });

  it('describes the tax report as shipped and makes no stale product claims', async () => {
    const STALE = [/full analytics/i, /remembers? your recent symbols/i, /forex-specific insights/i, /cuts the time/i, /AI engine/i];
    expect(PLAN_LIMITS.find((r) => r.feature.includes('tax P&L'))?.pro).toBe('Included');
    for (const a of BLOG_ARTICLES) {
      const Content = (await a.content()).default;
      const { container, unmount } = render(
        <MemoryRouter>
          <Content />
        </MemoryRouter>,
      );
      const text = `${container.textContent ?? ''} ${a.summary ?? ''} ${(a.faq ?? []).map((f) => f.answer).join(' ')}`;
      expect(text, a.slug).not.toMatch(TAX_PLANNED);
      for (const re of STALE) expect(text, `${a.slug} ${re}`).not.toMatch(re);
      unmount();
    }
  });
});

describe('page titles and descriptions', () => {
  it('stay within what a results page shows', () => {
    for (const p of SEO_PAGES) {
      expect(p.title.length, p.path).toBeLessThanOrEqual(65);
      expect(p.description.length, p.path).toBeLessThanOrEqual(160);
    }
  });
});

describe('pricing page', () => {
  it('answers the billing questions: trial end, currency, cancelling, refunds', () => {
    renderWithProviders(<PricingPage />);
    for (const q of ['What happens when the free trial ends?', 'Which currency will I pay in?', 'How do I cancel Pro?', 'Can I get a refund?']) {
      expect(screen.getByRole('heading', { name: q })).toBeInTheDocument();
    }
    expect(screen.getByText(/nothing is charged and your journal becomes read-only/)).toBeInTheDocument();
  });
});

describe('India page', () => {
  it('states that charges are estimated per trade and that the tax report is in Pro', () => {
    const { container } = renderWithProviders(<TradingJournalIndiaPage />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(TAX_PLANNED);
    expect(text).toMatch(/estimates brokerage, STT/);
    expect(text).toMatch(/Pro includes a tax report for each financial year/);
    expect(text).toContain('NSE circular 02/2026');
  });
});

describe('TraderSync comparison', () => {
  it('quotes the vendor prices, lists every source with its date and says what was not verified', () => {
    const { container } = renderWithProviders(<TraderSyncAlternativePage />);
    const c = COMPETITORS.find((x) => x.id === 'tradersync')!;
    const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!;
    for (const s of c.extraSources ?? []) {
      expect(sources.querySelector(`a[href="${s.url}"]`)).not.toBeNull();
      expect(sources.textContent).toContain(`checked ${s.checked}`);
    }
    expect(container.textContent).toMatch(/read in a web browser on 15 November 2026\. Not verified/);
  });
});

describe('About page', () => {
  it('says who it is for and what it does not do, with no origin story', () => {
    const { container } = renderWithProviders(<AboutPage />);
    expect(screen.getByRole('heading', { name: 'Who it is for' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What it does not do' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/frustration|built by a trader/i);
  });
});
