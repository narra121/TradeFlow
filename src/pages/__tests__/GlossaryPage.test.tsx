import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { GLOSSARY_TERMS } from '@/content/glossary/terms';
import { GlossaryPage } from '../glossary/GlossaryPage';

describe('GlossaryPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trading glossary' })).toBeInTheDocument();
  });

  it('renders glossary terms', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Win Rate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Profit Factor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Drawdown' })).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByPlaceholderText('Search terms...')).toBeInTheDocument();
  });

  it('filters terms by search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlossaryPage />);

    const searchInput = screen.getByPlaceholderText('Search terms...');
    await user.type(searchInput, 'drawdown');

    expect(screen.getByRole('heading', { level: 3, name: 'Drawdown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Maximum Drawdown' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/\d+ terms?/);
  });

  it('renders letter navigation', () => {
    renderWithProviders(<GlossaryPage />);
    // Letter nav links are <a> elements with href="#letter-X"
    const wLinks = screen.getAllByText('W');
    expect(wLinks.some((el) => el.tagName === 'A' && el.getAttribute('href') === '#letter-W')).toBe(true);
    const pLinks = screen.getAllByText('P');
    expect(pLinks.some((el) => el.tagName === 'A' && el.getAttribute('href') === '#letter-P')).toBe(true);
  });

  it('renders term definitions', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByText(/measures the decline from a peak in account equity/)).toBeInTheDocument();
  });

  it('renders formulas for terms that have them', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByText(/Win Rate = \(Number of Winning Trades/)).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<GlossaryPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('hides non-matching terms when searching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlossaryPage />);

    const searchInput = screen.getByPlaceholderText('Search terms...');
    await user.type(searchInput, 'scalping');

    expect(screen.getByRole('heading', { level: 3, name: 'Scalping' })).toBeInTheDocument();
    expect(screen.queryByText('Win Rate')).not.toBeInTheDocument();
  });

  it('explains an empty search and offers Clear search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlossaryPage />);
    await user.type(screen.getByPlaceholderText('Search terms...'), 'zzzz');
    expect(screen.getByText(/No terms match/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 terms');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.queryByText(/No terms match/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Win Rate' })).toBeInTheDocument();
  });

  it('links each of the five metric entries to its own term page', () => {
    renderWithProviders(<GlossaryPage />);
    for (const [term, path] of [
      ['Profit Factor', '/glossary/profit-factor'],
      ['Expectancy', '/glossary/expectancy'],
      ['R-Multiple', '/glossary/r-multiple'],
      ['Win Rate', '/glossary/win-rate'],
      ['Maximum Drawdown', '/glossary/maximum-drawdown'],
    ]) {
      expect(screen.getByRole('link', { name: `${term}: formula, worked example and calculator` })).toHaveAttribute('href', path);
    }
    expect(GLOSSARY_TERMS.filter((t) => t.page)).toHaveLength(5);
  });

  it('adds R-multiple and the open-interest terms, each linking to the build-ups article', () => {
    const { container } = renderWithProviders(<GlossaryPage />);
    expect(screen.getByRole('heading', { level: 3, name: 'R-Multiple' })).toBeInTheDocument();
    const oi = ['Open Interest', 'Long Build-Up', 'Short Build-Up', 'Long Unwinding', 'Short Covering', 'Call Unwinding', 'Put Unwinding'];
    for (const name of oi) expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    const article = container.querySelectorAll('a[href="/blog/long-buildup-short-covering-long-unwinding"]');
    expect(article.length).toBeGreaterThanOrEqual(oi.length);
    for (const letter of ['C', 'O', 'R']) expect(container.querySelector(`a[href="#letter-${letter}"]`), letter).not.toBeNull();
  });

  it('maps price and open interest to the four build-up terms and describes rather than predicts', () => {
    const def = (id: string) => GLOSSARY_TERMS.find((t) => t.id === id)!.definition;
    expect(def('long-build-up')).toMatch(/price rising while open interest rises/);
    expect(def('short-build-up')).toMatch(/price falling while open interest rises/);
    expect(def('long-unwinding')).toMatch(/price falling while open interest falls/);
    expect(def('short-covering')).toMatch(/price rising while open interest falls/);
    for (const id of ['long-build-up', 'short-build-up', 'long-unwinding', 'short-covering', 'call-unwinding', 'put-unwinding']) {
      expect(def(id), id).toMatch(/commonly read as/);
      expect(def(id), id).not.toMatch(/\bwill\b|signals? (a|that)|expect the price/i);
      expect(def(id).split(/(?<=\.)\s/).length, id).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the existing anchors and drops the unsourced thresholds from the metric entries', () => {
    const { container } = renderWithProviders(<GlossaryPage />);
    for (const id of ['drawdown', 'win-rate', 'profit-factor', 'expectancy', 'maximum-drawdown', 'risk-reward-ratio']) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
    const text = ['profit-factor', 'expectancy', 'maximum-drawdown'].map((id) => GLOSSARY_TERMS.find((t) => t.id === id)!.definition).join(' ');
    expect(text).not.toMatch(/1\.5|2\.0|excellent|guarantees|single most important/);
  });
});
