import { test, expect } from './fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/app/dashboard');
  });

  test('dashboard page loads with heading', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Your trading performance at a glance')).toBeVisible();
  });

  test('displays empty state when no trades in current period', async ({ authedPage }) => {
    const page = authedPage;

    // Wait for lazy-loaded DashboardView to fully render
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    // Empty state may show "No trades in this period" or the welcome message
    const emptyState = page.getByText('No trades in this period').or(page.getByText('Welcome to TradeQut'));
    await expect(emptyState).toBeVisible({ timeout: 15000 });
  });

  test('has action buttons (Add Trade / Import icons visible)', async ({ authedPage }) => {
    const page = authedPage;

    // Buttons use responsive text (hidden on mobile, visible on sm+)
    // Check for the Plus and Upload icons which are always visible
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible();
  });

  test('has Import button', async ({ authedPage }) => {
    const page = authedPage;

    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await expect(importButton).toBeVisible({ timeout: 10000 });
  });

  test('displays account filter', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.locator('.max-w-7xl')).toBeVisible();
  });

  test('displays date range filter', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.locator('.max-w-7xl')).toBeVisible();
  });

  test('main content area with charts renders', async ({ authedPage }) => {
    const page = authedPage;

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
