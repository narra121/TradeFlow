import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ResourcesPage } from '../resources/ResourcesPage';

describe('ResourcesPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<ResourcesPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trading calculators' })).toBeInTheDocument();
  });

  it('renders calculator cards', () => {
    renderWithProviders(<ResourcesPage />);
    expect(screen.getByText('Position size calculator')).toBeInTheDocument();
    expect(screen.getByText('Risk-reward calculator')).toBeInTheDocument();
    expect(screen.getByText('Pip value calculator')).toBeInTheDocument();
  });

  it('has links to calculator pages', () => {
    renderWithProviders(<ResourcesPage />);
    const links = screen.getAllByText('Open calculator');
    expect(links.length).toBe(3);
  });

  it('renders calculator descriptions', () => {
    renderWithProviders(<ResourcesPage />);
    expect(
      screen.getByText(/Calculate the right position size based on your account balance/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Determine your risk-reward ratio/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Calculate the value of a pip for any currency pair/)
    ).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<ResourcesPage />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} TradeQut`))).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    renderWithProviders(<ResourcesPage />);
    expect(
      screen.getByText(/Free tools to size positions, check risk-reward and value a pip/)
    ).toBeInTheDocument();
  });
});
