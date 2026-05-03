import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { GlossaryPage } from '../glossary/GlossaryPage';

describe('GlossaryPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByText('Trading Glossary')).toBeInTheDocument();
  });

  it('renders glossary terms', () => {
    renderWithProviders(<GlossaryPage />);
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
    expect(screen.getByText('Drawdown')).toBeInTheDocument();
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

    expect(screen.getByText('Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Maximum Drawdown')).toBeInTheDocument();
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

    expect(screen.getByText('Scalping')).toBeInTheDocument();
    expect(screen.queryByText('Win Rate')).not.toBeInTheDocument();
  });
});
