import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { pageTitle } from '@/config/seo';
import { METRIC_TERMS, metricTermSchema, type MetricTermId } from '@/content/glossary/metrics';
import { BLOG_ARTICLES } from '@/content/blog/articles';
import { getPublicRoutes } from '@/content/route-registry';
import { ExpectancyCalculatorPage } from '../resources/ExpectancyCalculatorPage';
import { ExpectancyTermPage } from '../glossary/terms/ExpectancyTermPage';
import { MaximumDrawdownTermPage } from '../glossary/terms/MaximumDrawdownTermPage';
import { ProfitFactorTermPage } from '../glossary/terms/ProfitFactorTermPage';
import { RMultipleTermPage } from '../glossary/terms/RMultipleTermPage';
import { WinRateTermPage } from '../glossary/terms/WinRateTermPage';

const PAGES: Record<MetricTermId, ComponentType> = {
  'profit-factor': ProfitFactorTermPage,
  expectancy: ExpectancyTermPage,
  'r-multiple': RMultipleTermPage,
  'win-rate': WinRateTermPage,
  'maximum-drawdown': MaximumDrawdownTermPage,
};

/** The deeper article and the tool each page must send readers to instead of repeating them. */
const DEEPER: Record<MetricTermId, string[]> = {
  'profit-factor': ['/blog/win-rate-vs-profit-factor', '/blog/trading-metrics-that-matter', '/resources/expectancy-calculator'],
  expectancy: ['/blog/trading-expectancy-formula', '/resources/expectancy-calculator', '/resources/equity-curve-simulator'],
  'r-multiple': ['/blog/r-multiple-explained', '/resources/position-size', '/resources/expectancy-calculator'],
  'win-rate': ['/blog/win-rate-vs-profit-factor', '/resources/expectancy-calculator', '/resources/risk-of-ruin-calculator'],
  'maximum-drawdown': [
    '/blog/trading-drawdown-calculation',
    '/blog/track-reduce-drawdown',
    '/resources/equity-curve-simulator',
    '/resources/prop-firm-drawdown-calculator',
    '/resources/risk-of-ruin-calculator',
  ],
};

const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const ADVICE = [/guaranteed/i, /can'?t lose/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /sure[- ]shot/i, /we recommend (buying|selling)/i, /\bbest\b/i, /#1/];
const UNSUPPORTED = [/(hundreds|thousands|millions) of (trading )?(journals|traders|users)/i, /studies (show|have shown|find)|research (shows|has shown|finds)/i];
/** The house maths rules (math-typography.test.ts): true minus and ×, never a hyphen or a letter x. */
const BAD_MATH = [/\d x \d/, /(?:\$[\d,.]+|\)|\b\d[\d,.]*%?) - (?:[($]|\d)/, /(?:^|[\s(:])-[$₹]?\d/];

function renderTerm(id: MetricTermId) {
  const Page = PAGES[id];
  return renderWithProviders(<Page />, { route: `/glossary/${id}` });
}

function articleText(id: MetricTermId): string {
  const { container, unmount } = renderTerm(id);
  const text = container.querySelector('article')?.textContent ?? '';
  unmount();
  return text;
}

describe.each(METRIC_TERMS.map((t) => [t.id, t] as const))('%s term page', (id, t) => {
  it('has one h1, opens with the definition and shows the formula', () => {
    const { container } = renderTerm(id);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: t.name })).toBeInTheDocument();
    const definition = screen.getByTestId('term-definition').textContent ?? '';
    expect(definition.split('. ')[0]).toMatch(new RegExp(`^(An? )?${t.name} is `, 'i'));
    expect(screen.getByRole('heading', { level: 2, name: `${t.name} formula` })).toBeInTheDocument();
    expect(screen.getByTestId('term-formula')).toHaveTextContent(t.formula.lines[0]);
    expect(screen.getByRole('heading', { level: 2, name: `${t.name} calculator` })).toBeInTheDocument();
  });

  it('renders at least four FAQ items and emits the same ones with a DefinedTerm in JSON-LD', () => {
    renderTerm(id);
    expect(t.faq.length).toBeGreaterThanOrEqual(4);
    const faq = screen.getByRole('heading', { level: 2, name: 'Frequently asked questions' }).closest('section')!;
    for (const f of t.faq) {
      expect(f.question.endsWith('?'), f.question).toBe(true);
      expect(within(faq).getByRole('heading', { level: 3, name: f.question })).toBeInTheDocument();
    }
    type Node = { '@type': string; mainEntity?: { name: string }[]; itemListElement?: { name: string }[] };
    const graph = metricTermSchema(t, pageTitle(t.title, ' | TradeQut'))['@graph'] as Node[];
    const node = (type: string) => graph.find((n) => n['@type'] === type);
    expect(node('FAQPage')?.mainEntity?.map((q) => q.name)).toEqual(t.faq.map((f) => f.question));
    expect(node('DefinedTerm')).toMatchObject({ name: t.name, url: `https://tradequt.com${t.path}` });
    expect(node('BreadcrumbList')?.itemListElement?.map((c) => c.name)).toEqual(['Home', 'Trading glossary', t.name]);
  });

  it('links to the other four term pages, the glossary, its article and tools, and only to registered routes', () => {
    const { container } = renderTerm(id);
    const hrefs = [...container.querySelectorAll('article a[href]')].map((a) => a.getAttribute('href') ?? '');
    for (const s of METRIC_TERMS.filter((x) => x.id !== id)) expect(hrefs, s.path).toContain(s.path);
    expect(hrefs).toContain('/glossary');
    for (const href of DEEPER[id]) expect(hrefs, href).toContain(href);
    for (const href of hrefs.filter((h) => h.startsWith('/'))) expect(PATHS.has(href.split('#')[0]) || href === '/signup', href).toBe(true);
  });

  it('sets its own canonical path, a title within 60 characters and a description within 160', async () => {
    renderTerm(id);
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`https://tradequt.com${t.path}`));
    expect(pageTitle(t.title, ' | TradeQut').length).toBeLessThanOrEqual(60);
    expect(t.description.length).toBeLessThanOrEqual(160);
    expect(PATHS.has(t.path)).toBe(true);
  });

  it('gives no advice, makes no unsupported claims and keeps the maths typography', () => {
    const text = articleText(id);
    for (const re of [...ADVICE, ...UNSUPPORTED]) expect(text, `${re}`).not.toMatch(re);
    for (const re of BAD_MATH) expect(text, `${re}`).not.toMatch(re);
    expect(text).toMatch(/nothing here is a recommendation to buy or sell/);
  });
});

describe('the calculators compute the worked examples and refuse bad inputs', () => {
  const result = () => screen.getByTestId('term-result');

  it('profit factor: 465 ÷ 255 = 1.82, and not defined with no losing trades', async () => {
    const user = userEvent.setup();
    renderTerm('profit-factor');
    expect(result()).toHaveTextContent('1.82');
    expect(screen.getByText('+210.00')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Gross loss'));
    await user.type(screen.getByLabelText('Gross loss'), '0');
    expect(result()).toHaveTextContent('Not defined');
    expect(screen.getByText(/no losing trades, so there is nothing to divide by/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Gross profit'), '{Home}-');
    expect(screen.getByText('Gross profit cannot be negative.')).toBeInTheDocument();
  });

  it('expectancy: +320.00 and +0.32R; a blank loss rate counts the zero trade as a loss', async () => {
    const user = userEvent.setup();
    renderTerm('expectancy');
    expect(result()).toHaveTextContent('+320.00');
    expect(screen.getByText('+0.32R')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Loss rate (%)'));
    expect(result()).toHaveTextContent('+230.00');
    await user.type(screen.getByLabelText('Loss rate (%)'), '70');
    expect(screen.getAllByText('Win rate and loss rate together cannot be more than 100 percent.').length).toBeGreaterThan(0);
  });

  it('R-multiple: the short is +1.90R, a zero stop distance is not defined, a long stop above entry is rejected', async () => {
    const user = userEvent.setup();
    renderTerm('r-multiple');
    expect(result()).toHaveTextContent('+1.90R');
    const stop = screen.getByLabelText('Initial stop');
    await user.clear(stop);
    await user.type(stop, '1450');
    expect(result()).toHaveTextContent('Not defined');
    await user.clear(stop);
    await user.type(stop, '1470');
    await user.click(screen.getByLabelText('Long'));
    expect(screen.getAllByText('For a long trade the stop must be below the entry.').length).toBeGreaterThan(0);
  });

  it('win rate: 45.0%, 47.4% without the zero trade, break-even 38.5%, 8.9 points above', async () => {
    const user = userEvent.setup();
    renderTerm('win-rate');
    expect(result()).toHaveTextContent('45.0%');
    expect(screen.getByText('47.4%')).toBeInTheDocument();
    expect(screen.getByText('38.5%')).toBeInTheDocument();
    expect(screen.getByText('+8.9 points')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Winning trades'), '.5');
    expect(screen.getAllByText('Enter whole numbers of trades, 0 or more.').length).toBeGreaterThan(0);
  });

  it('maximum drawdown: 10.09% on the balances, 8.00% on the returns, and names a token it cannot read', async () => {
    const user = userEvent.setup();
    renderTerm('maximum-drawdown');
    expect(result()).toHaveTextContent('10.09%');
    expect(screen.getByText(/1,100 from 10,900 at value 4 to 9,800 at value 6\./)).toBeInTheDocument();
    expect(screen.getByText('At value 8')).toBeInTheDocument();
    expect(screen.getByText('1,200 (9.23%)')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Returns (%)'));
    expect(result()).toHaveTextContent('8.00%');
    const series = screen.getByLabelText(/Returns per period/);
    await user.type(series, ' abc');
    expect(screen.getAllByText(/“abc” is not a number/).length).toBeGreaterThan(0);
    await user.clear(series);
    expect(screen.getAllByText('Enter at least one return.').length).toBeGreaterThan(0);
  });
});

describe('the five pages are not near-copies', () => {
  const shingles = (text: string, n = 5) => {
    const words = text.toLowerCase().match(/[\p{L}\p{N}.%₹$−+]+/gu) ?? [];
    const set = new Set<string>();
    for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
    return set;
  };
  const jaccard = (a: Set<string>, b: Set<string>) => {
    let shared = 0;
    for (const s of a) if (b.has(s)) shared++;
    return shared / (a.size + b.size - shared);
  };

  it('share under 8% of their five-word sequences, pair by pair, including the shared layout text (3.8% measured)', () => {
    const sets = METRIC_TERMS.map((t) => [t.id, shingles(articleText(t.id))] as const);
    let worst = { pair: '', value: 0 };
    for (let i = 0; i < sets.length; i++)
      for (let j = i + 1; j < sets.length; j++) {
        const value = jaccard(sets[i][1], sets[j][1]);
        if (value > worst.value) worst = { pair: `${sets[i][0]} / ${sets[j][0]}`, value };
      }
    expect(worst.value, `most similar pair: ${worst.pair}`).toBeLessThan(0.08);
  });

  it('never repeat a definition, example, FAQ question, mistake or caveat', () => {
    const fields = [
      METRIC_TERMS.map((t) => t.definition.split('. ')[0]),
      METRIC_TERMS.map((t) => t.example.heading),
      METRIC_TERMS.map((t) => t.title),
      METRIC_TERMS.map((t) => t.description),
      METRIC_TERMS.flatMap((t) => t.faq.map((f) => f.question)),
      METRIC_TERMS.flatMap((t) => t.mistakes.map((m) => m.lead)),
    ];
    for (const values of fields) expect(new Set(values).size, values.join(' | ')).toBe(values.length);
  });

  it('do not restate the article or calculator each one links to for depth: under 8% shared (3.2% measured)', async () => {
    const OWN: Record<MetricTermId, string[]> = {
      'profit-factor': ['win-rate-vs-profit-factor', 'trading-metrics-that-matter'],
      expectancy: ['trading-expectancy-formula'],
      'r-multiple': ['r-multiple-explained'],
      'win-rate': ['win-rate-vs-profit-factor'],
      'maximum-drawdown': ['trading-drawdown-calculation', 'track-reduce-drawdown'],
    };
    const worst = { pair: '', value: 0 };
    const compare = (id: MetricTermId, other: string, text: string) => {
      const value = jaccard(shingles(articleText(id)), shingles(text));
      if (value > worst.value) Object.assign(worst, { pair: `${id} / ${other}`, value });
    };
    for (const t of METRIC_TERMS) {
      for (const slug of OWN[t.id]) {
        const Content = (await BLOG_ARTICLES.find((a) => a.slug === slug)!.content()).default;
        const { container, unmount } = renderWithProviders(<Content />);
        compare(t.id, slug, container.textContent ?? '');
        unmount();
      }
    }
    const { container, unmount } = renderWithProviders(<ExpectancyCalculatorPage />);
    compare('expectancy', 'expectancy-calculator', container.querySelector('article')?.textContent ?? '');
    unmount();
    expect(worst.value, `most similar: ${worst.pair}`).toBeLessThan(0.08);
  });
});
