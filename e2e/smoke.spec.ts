import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads the landing page without errors', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // The landing page should show the TradeQut branding
    await expect(page.getByText('TradeQut').first()).toBeVisible();

    // The hero section should be visible
    await expect(page.getByText('Master Your')).toBeVisible();
    await expect(page.getByText('Trading Performance', { exact: true })).toBeVisible();

    // No critical console errors (filter out known benign ones)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('third-party') &&
        !err.includes('DevTools') &&
        !err.includes('ipapi.co') &&
        !err.includes('ERR_FAILED') &&
        !err.includes('status of 403')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('landing page has navigation links', async ({ page }) => {
    await page.goto('/');

    // Check nav links
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
  });

  test('landing page features section renders', async ({ page }) => {
    await page.goto('/');

    // Feature titles from the LandingPage component (use headings to avoid matching descriptions)
    await expect(page.getByRole('heading', { name: 'Advanced Analytics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Calendar View' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Multi-Account Support' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Goals & Rules' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Screenshot Import' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trade Journal' })).toBeVisible();
  });

  test('landing page renders at desktop viewport (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // At desktop, the nav links should be visible (hidden on mobile)
    // Scope to nav to avoid matching footer duplicates
    const nav = page.getByRole('navigation');
    await expect(nav.getByText('Features')).toBeVisible();
    await expect(nav.getByText('How it Works')).toBeVisible();
    await expect(nav.getByText('Testimonials')).toBeVisible();
    await expect(nav.getByText('Pricing')).toBeVisible();
  });

  test('login page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('third-party') &&
        !err.includes('DevTools') &&
        !err.includes('ipapi.co') &&
        !err.includes('ERR_FAILED') &&
        !err.includes('status of 403')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('signup page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('third-party') &&
        !err.includes('DevTools') &&
        !err.includes('ipapi.co') &&
        !err.includes('ERR_FAILED') &&
        !err.includes('status of 403')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');

    // The NotFound page should render
    // Check that the page loaded something (not a blank page)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('landing page "Get Started" links point to signup', async ({ page }) => {
    await page.goto('/');

    // The hero CTA links to /signup
    const getStartedLinks = page.getByRole('link', { name: /Get Started/i });
    const firstLink = getStartedLinks.first();
    await expect(firstLink).toHaveAttribute('href', '/signup');
  });

  test('landing page "Log In" link points to login', async ({ page }) => {
    await page.goto('/');

    const loginLink = page.getByRole('link', { name: 'Log In' });
    await expect(loginLink).toHaveAttribute('href', '/login');
  });
});

test.describe('Legal & Company Pages', () => {
  test('About Us page loads with company info', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('heading', { name: 'About TradeQut' })).toBeVisible();
    await expect(page.getByText('Our Story')).toBeVisible();
    await expect(page.getByText('What We Stand For')).toBeVisible();
    await expect(page.getByText('What TradeQut Offers')).toBeVisible();
    await expect(page.getByText('Disclaimer')).toBeVisible();
    // Business contact details required by PayU
    await expect(page.getByText('TradeQutJournal')).toBeVisible();
    await expect(page.getByText('support@tradequt.com')).toBeVisible();
  });

  test('Privacy Policy page loads with all sections', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByText('Information We Collect')).toBeVisible();
    await expect(page.getByText('How We Use Your Information')).toBeVisible();
    await expect(page.getByText('Data Storage & Security')).toBeVisible();
    await expect(page.getByText('Your Rights')).toBeVisible();
  });

  test('Terms of Service page loads with all sections', async ({ page }) => {
    await page.goto('/terms');

    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByText('Acceptance of Terms')).toBeVisible();
    await expect(page.getByText('Trading Disclaimer')).toBeVisible();
    await expect(page.getByText('Payment Terms')).toBeVisible();
    await expect(page.getByText('Limitation of Liability')).toBeVisible();
    await expect(page.getByText('Governing Law')).toBeVisible();
  });

  test('Refund Policy page loads with required PayU details', async ({ page }) => {
    await page.goto('/refund');

    await expect(page.getByRole('heading', { name: 'Refund & Cancellation Policy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Refund Eligibility/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^3\. Cancellation Policy$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Refund Processing/ })).toBeVisible();
    // PayU requires mode of refund and timeframe
    await expect(page.getByText(/original payment method/)).toBeVisible();
    await expect(page.getByText(/5-7 business days/)).toBeVisible();
  });

  test('Contact Us page loads with all contact details', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    // Must have email, phone, and address for PayU
    await expect(page.getByText('support@tradequt.com')).toBeVisible();
    await expect(page.getByText('+91 8501018125')).toBeVisible();
    await expect(page.getByText('Bhupalpally, Telangana')).toBeVisible();
  });

  test('all legal pages have consistent footer navigation', async ({ page }) => {
    const pages = ['/about', '/privacy', '/terms', '/refund', '/contact'];

    for (const path of pages) {
      await page.goto(path);
      const footer = page.locator('footer');
      await expect(footer.getByText('About Us')).toBeVisible();
      await expect(footer.getByText('Privacy Policy')).toBeVisible();
      await expect(footer.getByText('Terms of Service')).toBeVisible();
      await expect(footer.getByText('Refund Policy')).toBeVisible();
      await expect(footer.getByText('Contact Us')).toBeVisible();
    }
  });

  test('landing page footer has About Us link', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer.getByText('About Us')).toBeVisible();
  });
});
