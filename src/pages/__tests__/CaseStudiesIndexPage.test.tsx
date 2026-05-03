import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CaseStudiesIndexPage } from '../case-studies/CaseStudiesIndexPage';

describe('CaseStudiesIndexPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText('Trading Success Stories')).toBeInTheDocument();
  });

  it('renders case study cards', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText(/Day Trader Went from 40% to 62%/)).toBeInTheDocument();
    expect(screen.getByText(/FTMO Challenge/)).toBeInTheDocument();
  });

  it('renders all case studies', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText(/Revenge Trading to Discipline/)).toBeInTheDocument();
    expect(screen.getByText(/Multi-Account Management/)).toBeInTheDocument();
    expect(screen.getByText(/Hidden Edge in Forex Sessions/)).toBeInTheDocument();
  });

  it('renders trader type and market tags', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText('Day Trader')).toBeInTheDocument();
    expect(screen.getByText('Prop Trader')).toBeInTheDocument();
    expect(screen.getByText('Swing Trader')).toBeInTheDocument();
  });

  it('renders key result metrics', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(screen.getByText(/40% → 62% win rate/)).toBeInTheDocument();
    expect(screen.getByText(/Passed FTMO on 3rd attempt/)).toBeInTheDocument();
  });

  it('renders the footer', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    renderWithProviders(<CaseStudiesIndexPage />);
    expect(
      screen.getByText(/How real traders improved consistency/)
    ).toBeInTheDocument();
  });
});
