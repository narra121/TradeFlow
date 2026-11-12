import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
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
});
