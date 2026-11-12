import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CHANGELOG_ENTRIES } from '@/content/changelog/entries';
import { ChangelogPage } from '../changelog/ChangelogPage';

describe('ChangelogPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Changelog' })).toBeInTheDocument();
  });

  it('renders version badges', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.8.1')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('renders entry titles', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('AI Insights and Chat paused for a redesign')).toBeInTheDocument();
    expect(screen.getByText('First release')).toBeInTheDocument();
  });

  it('renders change type badges', () => {
    renderWithProviders(<ChangelogPage />);
    const newBadges = screen.getAllByText('New');
    expect(newBadges.length).toBeGreaterThan(0);
  });

  it('renders Improved badges', () => {
    renderWithProviders(<ChangelogPage />);
    const improvedBadges = screen.getAllByText('Improved');
    expect(improvedBadges.length).toBeGreaterThan(0);
  });

  it('renders Fixed badges', () => {
    renderWithProviders(<ChangelogPage />);
    const fixedBadges = screen.getAllByText('Fixed');
    expect(fixedBadges.length).toBeGreaterThan(0);
  });

  it('renders all version entries', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('v1.3.0')).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<ChangelogPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('renders change text for specific entries', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('Pay for a Pro subscription monthly or yearly through Stripe Checkout')).toBeInTheDocument();
    expect(screen.getByText(/Trade journal with strategy, notes/)).toBeInTheDocument();
  });

  it('formats dates as 11 Nov 2026', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getAllByText('11 Nov 2026').length).toBeGreaterThan(0);
    expect(screen.queryByText(/November 11, 2026/)).not.toBeInTheDocument();
  });

  it('keeps history-only entries out of the in-app popover and never mentions ads', () => {
    const history = CHANGELOG_ENTRIES.filter((e) => e.inApp === false);
    expect(history.map((e) => e.version)).toContain('1.8.1');
    expect(CHANGELOG_ENTRIES.slice(0, 1)[0].inApp).not.toBe(false);
    expect(JSON.stringify(CHANGELOG_ENTRIES)).not.toMatch(/(^|[^a-z])ads?([^a-z]|$)/i);
  });

  it('does not list removed or internal features as shipped', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.queryByText(/Firebase/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$1\.99/)).not.toBeInTheDocument();
  });
});
