import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { BlogIndexPage } from '../blog/BlogIndexPage';

describe('BlogIndexPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
  });

  it('renders article cards', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getByText('How to keep a trading journal: the complete guide')).toBeInTheDocument();
    expect(screen.getByText('Win rate vs profit factor: which matters more?')).toBeInTheDocument();
  });

  it('renders tag filter with All button', () => {
    renderWithProviders(<BlogIndexPage />);
    const select = screen.getByRole('combobox', { name: 'Topic' });
    expect(select).toHaveValue('');
    expect(within(select).getByRole('option', { name: 'All topics' })).toBeInTheDocument();
  });

  it('filters articles by tag', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogIndexPage />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'forex');

    expect(screen.getByText('Forex trading journal: what forex traders should track')).toBeInTheDocument();
    expect(screen.queryByText('How to keep a trading journal: the complete guide')).not.toBeInTheDocument();
  });

  it('shows all articles when All tag is clicked after filtering', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogIndexPage />);

    // Filter to a specific tag
    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), 'forex');

    // Choose All topics to reset
    await user.selectOptions(screen.getByRole('combobox', { name: 'Topic' }), '');

    expect(screen.getByText('How to keep a trading journal: the complete guide')).toBeInTheDocument();
    expect(screen.getByText('Forex trading journal: what forex traders should track')).toBeInTheDocument();
  });

  it('does not render one button per topic (no tag wall) and shows tags as plain text', () => {
    const { container } = renderWithProviders(<BlogIndexPage />);
    expect(screen.queryAllByRole('button', { name: /^(forex|beginner|journaling)$/i })).toHaveLength(0);
    expect(container.querySelectorAll('[class*="rounded-full"]')).toHaveLength(0);
    expect(screen.getAllByText(/beginner · journaling/).length).toBeGreaterThan(0);
  });

  it('shows how many articles each topic has', () => {
    renderWithProviders(<BlogIndexPage />);
    const select = screen.getByRole('combobox', { name: 'Topic' });
    expect(within(select).getByRole('option', { name: /^Forex \(\d+\)$/ })).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<BlogIndexPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('renders article descriptions', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(
      screen.getByText(/Learn why a trading journal is essential for trading success/)
    ).toBeInTheDocument();
  });

  it('renders reading time for articles', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getAllByText(/min read/).length).toBeGreaterThan(0);
  });
});
