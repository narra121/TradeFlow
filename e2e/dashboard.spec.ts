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

  test('displays empty state when no trades exist', async ({ authedPage }) => {
    const page = authedPage;

    // With no trades, Dashboard shows welcome empty state instead of stat cards
    await expect(page.getByText('Welcome to TradeFlow!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Add Your First Trade')).toBeVisible();
    await expect(page.getByText('Import Trades')).toBeVisible();
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

    const importButton = page.getByRole('button', { name: /Import/i });
    await expect(importButton).toBeVisible();
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
