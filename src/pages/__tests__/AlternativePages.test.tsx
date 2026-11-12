import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import AlternativesIndexPage from '../seo/AlternativesIndexPage';
import TradeZellaAlternativePage from '../seo/TradeZellaAlternativePage';
import TraderSyncAlternativePage from '../seo/TraderSyncAlternativePage';
import TradesVizAlternativePage from '../seo/TradesVizAlternativePage';
import { COMPETITORS } from '@/content/alternatives';

const SUPERLATIVES = /\b(best|better than|#1|leading|top[- ]rated|worst|superior|unbeatable|number one|the only)\b/i;

const PAGES = [
  ['tradezella', TradeZellaAlternativePage],
  ['tradersync', TraderSyncAlternativePage],
  ['tradesviz', TradesVizAlternativePage],
] as const;

describe('comparison pages (E-084)', () => {
  for (const [id, Page] of PAGES) {
    const competitor = COMPETITORS.find((c) => c.id === id)!;

    it(`${id}: carries a sources list with the vendor URL and the date it was checked`, () => {
      const { container } = renderWithProviders(<Page />);
      const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!;
      expect(sources.textContent).toContain(`checked ${competitor.checked}`);
      expect(sources.querySelector(`a[href="${competitor.pricingUrl}"]`)).not.toBeNull();
      expect(container.textContent).toContain(`Prices were checked on ${competitor.checked}`);
    });

    it(`${id}: uses no superlatives and names where the competitor is stronger`, () => {
      const { container } = renderWithProviders(<Page />);
      expect(container.textContent).not.toMatch(SUPERLATIVES);
      expect(screen.getByRole('heading', { name: new RegExp(`Where ${competitor.name} is stronger`) })).toBeInTheDocument();
    });
  }

  it('tradersync: says what could not be verified instead of quoting a price', () => {
    const { container } = renderWithProviders(<TraderSyncAlternativePage />);
    expect(container.textContent).toMatch(/not verified/i);
    expect(container.textContent).toMatch(/403/);
  });

  it('the hub states that unverified facts are marked and lists all three comparisons', () => {
    const { container } = renderWithProviders(<AlternativesIndexPage />);
    expect(container.textContent).not.toMatch(SUPERLATIVES);
    expect(screen.getAllByRole('link', { name: /alternative$/ })).toHaveLength(3);
    expect(container.textContent).toMatch(/could not\s+be read, we say so/);
  });
});
