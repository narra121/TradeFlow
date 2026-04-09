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

    // The landing page should show the TradeFlow branding
    await expect(page.getByText('TradeFlow').first()).toBeVisible();

    // The hero section should be visible
    await expect(page.getByText('Master Your')).toBeVisible();
    await expect(page.getByText('Trading Performance', { exact: true })).toBeVisible();

    // No critical console errors (filter out known benign ones)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('third-party') &&
        !err.includes('DevTools')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('landing page has navigation links', async ({ page }) => {
    await page.goto('/');

    // Check nav links
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started', exact: true })).toBeVisible();
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
        !err.includes('DevTools')
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
        !err.includes('DevTools')
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
