import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CaseStudiesIndexPage } from '../case-studies/CaseStudiesIndexPage';
import { CASE_STUDIES } from '@/content/case-studies/studies';

describe('CaseStudiesIndexPage', () => {
  it('is titled as illustrative scenarios, not success stories', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Journaling scenarios (illustrative)' })).toBeInTheDocument();
    expect(screen.queryByText(/success stories/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/real traders/i)).not.toBeInTheDocument();
  });

  it('says every scenario uses hypothetical data', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText(/Every scenario uses hypothetical data/)).toBeInTheDocument();
  });

  it('renders a card for every scenario with its method', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    for (const study of CASE_STUDIES) {
      expect(screen.getByText(study.title)).toBeInTheDocument();
      expect(screen.getByText(study.method)).toBeInTheDocument();
    }
  });

  it('shows trader type and market tags', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText('Day trader · US stocks')).toBeInTheDocument();
    expect(screen.getByText('Prop trader · Forex')).toBeInTheDocument();
    expect(screen.getByText('Swing trader · Crypto')).toBeInTheDocument();
  });

  it('renders the shared footer', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('has no named people or outcome claims in any title or description', () => {
    for (const study of CASE_STUDIES) {
      expect(study.title + study.description).not.toMatch(/\b\d+% (to|→)|went from|passed|real (trader|customer)/i);
    }
  });
});
