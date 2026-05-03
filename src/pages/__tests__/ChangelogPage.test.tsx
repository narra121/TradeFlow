import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ChangelogPage } from '../changelog/ChangelogPage';

describe('ChangelogPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });

  it('renders version badges', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('v1.8.0')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('renders entry titles', () => {
    renderWithProviders(<ChangelogPage />);
    expect(screen.getByText('AI Insights & Chat')).toBeInTheDocument();
    expect(screen.getByText('MVP Launch')).toBeInTheDocument();
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
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
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
    expect(screen.getByText('AI-powered trading insights via Firebase Cloud Functions')).toBeInTheDocument();
    expect(screen.getByText(/Trade CRUD with full journaling fields/)).toBeInTheDocument();
  });
});
