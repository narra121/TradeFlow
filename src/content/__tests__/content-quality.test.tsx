import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BLOG_ARTICLES } from '../blog/articles';
import { CASE_STUDIES } from '../case-studies/studies';
import { COMPETITORS } from '../alternatives';
import { PLAN_LIMITS, PRO_PRICES, proPrice } from '../product-facts';
import { FOREX_PAIRS, getPair, pipValue } from '../forexPairs';

const ADVICE = [/guaranteed/i, /can'?t lose/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /sure[- ]shot/i, /buy (now|this stock)/i, /we recommend (buying|selling)/i];

describe('articles', () => {
  it('have a summary, at least two FAQ items and a short description', () => {
    for (const a of BLOG_ARTICLES.filter((x) => x.publishedAt >= '2026-11-11')) {
      expect(a.summary?.length ?? 0, a.slug).toBeGreaterThan(80);
      expect(a.faq?.length ?? 0, a.slug).toBeGreaterThanOrEqual(2);
      expect(a.description.length, a.slug).toBeLessThanOrEqual(200);
    }
  });

  it('render, carry the educational disclaimer or a source list, and contain no advice or guarantees', async () => {
    for (const a of BLOG_ARTICLES.filter((x) => x.publishedAt >= '2026-11-11')) {
      const Content = (await a.content()).default;
      const { container, unmount } = render(
        <MemoryRouter>
          <Content />
        </MemoryRouter>,
      );
      const text = container.textContent ?? '';
      expect(text.length, a.slug).toBeGreaterThan(600);
      for (const re of ADVICE) expect(text, `${a.slug} ${re}`).not.toMatch(re);
      expect(/Educational content only|hypothetical|Sources/i.test(text), a.slug).toBe(true);
      unmount();
    }
  });

  it('F&O charges article cites Zerodha, the STT change date and its worked total', async () => {
    const a = BLOG_ARTICLES.find((x) => x.slug === 'fo-trading-charges-india')!;
    const Content = (await a.content()).default;
    const { container } = render(
      <MemoryRouter>
        <Content />
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Zerodha: brokerage and charges');
    expect(text).toContain('1 April 2026');
    expect(text).toContain('72.83');
    expect(text).toContain('927.17');
    expect(container.querySelector('a[href="https://zerodha.com/charges"]')).not.toBeNull();
  });
});

describe('all articles (including the legacy ones)', () => {
  // Statistics and "across many users" claims that nothing in this repository supports.
  const UNSUPPORTED = [
    /across (hundreds|thousands|millions) of/i,
    /(hundreds|thousands|millions) of (trading )?(journals|traders|users)/i,
    /industry estimates/i,
    /\b\d{2}\s*(to|-)\s*\d{2}\s*(percent|%) of (retail )?traders/i,
    /studies (show|have shown|find)|research (shows|has shown|finds)/i,
    /data-proven|almost always dramatic/i,
  ];

  it('make no unsupported statistical or user-base claims', async () => {
    for (const a of BLOG_ARTICLES) {
      const Content = (await a.content()).default;
      const { container, unmount } = render(
        <MemoryRouter>
          <Content />
        </MemoryRouter>,
      );
      const text = (container.textContent ?? '') + ' ' + a.title + ' ' + a.description + ' ' + (a.summary ?? '');
      for (const re of UNSUPPORTED) expect(text, `${a.slug} ${re}`).not.toMatch(re);
      for (const re of ADVICE) expect(text, `${a.slug} ${re}`).not.toMatch(re);
      unmount();
    }
  });
});

describe('case studies', () => {
  it('are illustrative scenarios with a method, not outcomes', () => {
    expect(CASE_STUDIES.length).toBe(5);
    for (const s of CASE_STUDIES) {
      expect(s.title).toMatch(/^Scenario:/);
      expect(s.method.length).toBeGreaterThan(5);
      expect(s).not.toHaveProperty('keyResult');
    }
  });
});

describe('comparison pages', () => {
  it('record the date each vendor page was checked and state what was not verified', () => {
    for (const c of COMPETITORS) {
      expect(c.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.pricingUrl).toMatch(/^https:\/\//);
      expect(c.strongerAt.length).toBeGreaterThan(0);
    }
    const sync = COMPETITORS.find((c) => c.id === 'tradersync')!;
    expect(sync.unverified?.join(' ')).toMatch(/not verified/i);
    expect(sync.facts.join(' ')).not.toMatch(/\$\d/);
  });
});

describe('product facts', () => {
  it('match the monetization contract', () => {
    expect(proPrice('USD', 'month').amount).toBe(9.99);
    expect(proPrice('USD', 'year').amount).toBe(79);
    expect(proPrice('INR', 'month').amount).toBe(199);
    expect(proPrice('INR', 'year').amount).toBe(1499);
    expect(PRO_PRICES).toHaveLength(4);
  });

  it('list the tax report as included in Pro and make no ad claims (no ads at launch)', () => {
    expect(PLAN_LIMITS.find((r) => r.feature.includes('tax P&L'))?.pro).toBe('Included');
    expect(PLAN_LIMITS.find((r) => /(^|[^a-z])ads?([^a-z]|$)/i.test(r.feature))).toBeUndefined();
  });
});

describe('pip values', () => {
  it('EUR/USD standard lot is 10 USD per pip, mini lot 1', () => {
    expect(pipValue(getPair('EUR/USD'), 100000, 'USD').inUsd).toBeCloseTo(10, 6);
    expect(pipValue(getPair('EUR/USD'), 10000, 'USD').inUsd).toBeCloseTo(1, 6);
  });

  it('USD/JPY pip is 1000 JPY per standard lot, converted at the pair rate', () => {
    const v = pipValue(getPair('USD/JPY'), 100000, 'USD');
    expect(v.inQuote).toBeCloseTo(1000, 6);
    expect(v.inUsd).toBeCloseTo(1000 / 155.5, 6);
    expect(v.quoteCurrency).toBe('JPY');
  });

  it('converts to the account currency', () => {
    const inr = pipValue(getPair('EUR/USD'), 100000, 'INR').inAccount;
    expect(inr).toBeCloseTo(10 / 0.01193, 4);
  });

  it('has a pair for every calculator option', () => {
    expect(FOREX_PAIRS.length).toBeGreaterThanOrEqual(7);
  });
});
