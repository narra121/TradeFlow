import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LandingPage />);
    // The brand name should be present (appears multiple times in nav and footer)
    expect(screen.getAllByText('TradeFlow').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the hero headline', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Master Your')).toBeInTheDocument();
    expect(screen.getByText('Trading Performance')).toBeInTheDocument();
  });

  it('displays the hero subtitle text', () => {
    renderWithProviders(<LandingPage />);
    expect(
      screen.getByText(/Track, analyze, and improve your trades/)
    ).toBeInTheDocument();
  });

  it('has a "Log In" link navigating to /login', () => {
    renderWithProviders(<LandingPage />);
    const loginLink = screen.getByRole('link', { name: /Log In/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('has a "Get Started" link navigating to /signup in the nav', () => {
    renderWithProviders(<LandingPage />);
    // There are multiple "Get Started" buttons; check nav one
    const signupLinks = screen.getAllByRole('link', { name: /Get Started/i });
    const navSignupLink = signupLinks.find(
      (link) => link.getAttribute('href') === '/signup'
    );
    expect(navSignupLink).toBeDefined();
  });

  it('displays feature cards', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    expect(screen.getByText('Calendar View')).toBeInTheDocument();
    expect(screen.getByText('Multi-Account Support')).toBeInTheDocument();
    expect(screen.getByText('Goals & Rules')).toBeInTheDocument();
    expect(screen.getByText('Screenshot Import')).toBeInTheDocument();
    expect(screen.getByText('Trade Journal')).toBeInTheDocument();
  });

  it('displays "How It Works" section steps', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByText('Log Your Trades')).toBeInTheDocument();
    expect(screen.getByText('Analyze & Improve')).toBeInTheDocument();
  });

  it('displays testimonials', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('David Kim')).toBeInTheDocument();
  });

  it('displays stats section', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('10,000+')).toBeInTheDocument();
    expect(screen.getByText('Active Traders')).toBeInTheDocument();
    expect(screen.getByText('500K+')).toBeInTheDocument();
  });

  it('displays pricing section with free plan', () => {
    renderWithProviders(<LandingPage />);
    // "100%" and "Free to Use" are in separate elements, so match partial
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Free to Use/)).toBeInTheDocument();
    expect(screen.getByText('Forever Free')).toBeInTheDocument();
  });

  it('has CTA button linking to signup', () => {
    renderWithProviders(<LandingPage />);
    const ctaLinks = screen.getAllByRole('link', {
      name: /Get Started/i,
    });
    // All "Get Started" links should point to /signup
    ctaLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/signup');
    });
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<LandingPage />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${year} TradeFlow`))
    ).toBeInTheDocument();
  });

  it('renders navigation anchor links for sections', () => {
    renderWithProviders(<LandingPage />);
    // "Features" and "Pricing" appear in both nav and footer, so use getAllByText
    expect(screen.getAllByText('Features').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How it Works').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Testimonials').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pricing').length).toBeGreaterThanOrEqual(1);
  });
});
