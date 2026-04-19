import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LandingPage />);
    // The brand name should be present (appears multiple times in nav and footer)
    expect(screen.getAllByText('TradeQut').length).toBeGreaterThanOrEqual(1);
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

  it('displays pricing section', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText(/Transparent Pricing/)).toBeInTheDocument();
    expect(screen.getByText(/All core features are free forever/)).toBeInTheDocument();
  });

  it('has CTA button linking to signup', () => {
    renderWithProviders(<LandingPage />);
    const ctaLinks = screen.getAllByRole('link', {
      name: /Get Started Free/i,
    });
    // All "Get Started Free" links should point to /signup
    ctaLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/signup');
    });
  });

  it('renders the footer with copyright', () => {
    renderWithProviders(<LandingPage />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${year} TradeQut`))
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

describe('LandingPage - Mobile Navigation', () => {
  it('renders hamburger menu button', () => {
    renderWithProviders(<LandingPage />);
    const hamburgerButton = screen.getByLabelText('Toggle menu');
    expect(hamburgerButton).toBeInTheDocument();
    // The hamburger button has md:hidden class so it only shows on mobile viewports.
    // Note: jsdom does not enforce CSS media queries, so the button is always queryable.
    expect(hamburgerButton).toHaveClass('md:hidden');
  });

  it('mobile menu is hidden by default', () => {
    renderWithProviders(<LandingPage />);
    // The mobile menu is conditionally rendered (not in DOM when mobileMenuOpen is false).
    // Nav links in the mobile menu have href="#features", etc.
    // The desktop nav also has these links, so we check that the mobile menu container
    // (which contains links inside a div with md:hidden) is not rendered.
    // When the menu is closed, "Features" appears only in the desktop nav and footer.
    // The mobile menu div would add extra occurrences.
    const featuresLinks = screen.getAllByText('Features');
    // Desktop nav link + footer link = 2 occurrences (no mobile menu)
    expect(featuresLinks.length).toBe(2);
  });

  it('toggles mobile menu when hamburger is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderWithProviders(<LandingPage />);
    const hamburgerButton = screen.getByLabelText('Toggle menu');

    // Mobile menu should not be visible initially
    const featuresBefore = screen.getAllByText('Features');
    expect(featuresBefore.length).toBe(2); // desktop nav + footer only

    // Click to open
    await user.click(hamburgerButton);

    // Mobile menu should now be visible, adding an extra "Features" link
    const featuresAfter = screen.getAllByText('Features');
    expect(featuresAfter.length).toBe(3); // desktop nav + mobile menu + footer

    // Click to close
    await user.click(hamburgerButton);

    // Mobile menu should be hidden again
    const featuresAfterClose = screen.getAllByText('Features');
    expect(featuresAfterClose.length).toBe(2);
  });

  it('mobile menu contains all navigation links', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderWithProviders(<LandingPage />);

    // Open the mobile menu
    await user.click(screen.getByLabelText('Toggle menu'));

    // After opening, all nav links should have an additional occurrence from the mobile menu
    const featuresLinks = screen.getAllByText('Features');
    const howItWorksLinks = screen.getAllByText('How it Works');
    const testimonialsLinks = screen.getAllByText('Testimonials');
    const pricingLinks = screen.getAllByText('Pricing');

    // Each should now include the mobile menu link (desktop nav + mobile menu + footer where applicable)
    expect(featuresLinks.length).toBeGreaterThanOrEqual(3);
    expect(howItWorksLinks.length).toBeGreaterThanOrEqual(2);
    expect(testimonialsLinks.length).toBeGreaterThanOrEqual(2);
    expect(pricingLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('mobile menu contains CTA buttons', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderWithProviders(<LandingPage />);

    // Open the mobile menu
    await user.click(screen.getByLabelText('Toggle menu'));

    // "Log In" links: desktop nav has one, mobile menu adds another
    const loginLinks = screen.getAllByRole('link', { name: /Log In/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(2);

    // "Get Started" links: desktop nav + mobile menu + hero CTA + other CTAs
    const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(2);

    // Verify the mobile menu CTA links point to correct routes
    const mobileLoginLink = loginLinks.find(
      (link) => link.getAttribute('href') === '/login'
    );
    expect(mobileLoginLink).toBeDefined();

    const mobileSignupLink = getStartedLinks.find(
      (link) => link.getAttribute('href') === '/signup'
    );
    expect(mobileSignupLink).toBeDefined();
  });
});
