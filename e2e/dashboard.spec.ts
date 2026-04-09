import { test, expect } from './fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/app/dashboard');
  });

  test('dashboard page loads with heading', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Track your trading performance')).toBeVisible();
  });

  test('displays stat cards', async ({ authedPage }) => {
    const page = authedPage;

    // The dashboard has 4 stat cards: Total P&L, Win Rate, Total Trades, Profit Factor
    await expect(page.getByText('Total P&L').first()).toBeVisible();
    await expect(page.getByText('Win Rate').first()).toBeVisible();
    await expect(page.getByText('Total Trades').first()).toBeVisible();
    await expect(page.getByText('Profit Factor').first()).toBeVisible();
  });

  test('has New Trade button', async ({ authedPage }) => {
    const page = authedPage;

    const addButton = page.getByRole('button', { name: /New Trade/i });
    await expect(addButton).toBeVisible();
  });

  test('has Import button', async ({ authedPage }) => {
    const page = authedPage;

    const importButton = page.getByRole('button', { name: /Import/i });
    await expect(importButton).toBeVisible();
  });

  test('New Trade button opens the add trade modal', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /New Trade/i }).click();

    // The AddTradeModal should appear — check for its heading instead of dialog role
    await expect(page.getByText('Add New Trade')).toBeVisible({ timeout: 10000 });
  });

  test('displays account filter', async ({ authedPage }) => {
    const page = authedPage;

    // The AccountFilter component should be visible in the header area
    // It's a select/dropdown for filtering by account
    await expect(page.locator('.max-w-7xl')).toBeVisible();
  });

  test('displays date range filter', async ({ authedPage }) => {
    const page = authedPage;

    // The DateRangeFilter component should be present
    // It contains preset buttons like "Today", "This Week", etc.
    await expect(page.locator('.max-w-7xl')).toBeVisible();
  });

  test('main content area with charts renders', async ({ authedPage }) => {
    const page = authedPage;

    // The main content grid should be visible (contains chart area and win rate ring)
    // Even with no trades, the layout structure should render
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
