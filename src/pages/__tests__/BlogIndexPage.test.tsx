import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { BlogIndexPage } from '../blog/BlogIndexPage';

describe('BlogIndexPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getByText('Trading Journal Blog')).toBeInTheDocument();
  });

  it('renders article cards', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getByText('How to Keep a Trading Journal: The Complete Guide')).toBeInTheDocument();
    expect(screen.getByText('Win Rate vs Profit Factor: Which Matters More?')).toBeInTheDocument();
  });

  it('renders tag filter with All button', () => {
    renderWithProviders(<BlogIndexPage />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('filters articles by tag', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogIndexPage />);

    const forexButton = screen.getByRole('button', { name: /forex/i });
    await user.click(forexButton);

    expect(screen.getByText('Forex Trading Journal: What Forex Traders Should Track')).toBeInTheDocument();
    expect(screen.queryByText('How to Keep a Trading Journal: The Complete Guide')).not.toBeInTheDocument();
  });

  it('shows all articles when All tag is clicked after filtering', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlogIndexPage />);

    // Filter to a specific tag
    const forexButton = screen.getByRole('button', { name: /forex/i });
    await user.click(forexButton);

    // Click All to reset
    const allButton = screen.getByRole('button', { name: 'All' });
    await user.click(allButton);

    expect(screen.getByText('How to Keep a Trading Journal: The Complete Guide')).toBeInTheDocument();
    expect(screen.getByText('Forex Trading Journal: What Forex Traders Should Track')).toBeInTheDocument();
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
