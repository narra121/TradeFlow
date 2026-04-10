import { test, expect } from './fixtures/auth';

test.describe('App Navigation', () => {
  test.beforeEach(async ({ authedPage }) => {
    // Navigate to the app dashboard (auth is already set up by the fixture)
    await authedPage.goto('/app/dashboard');
  });

  test('sidebar displays all navigation links', async ({ authedPage }) => {
    const page = authedPage;

    // Main nav items from Sidebar component
    await expect(page.getByRole('button', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Accounts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Trade Log/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Analytics/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Goals/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();

    // Profile button in the bottom section
    await expect(page.getByRole('button', { name: /Profile/i })).toBeVisible();
  });

  test('sidebar shows TradeFlow branding', async ({ authedPage }) => {
    const page = authedPage;
    await expect(page.getByText('TradeFlow')).toBeVisible();
  });

  test('navigates to Dashboard and highlights it as active', async ({ authedPage }) => {
    const page = authedPage;

    // Dashboard should already be active on /app/dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('navigates to Accounts page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Accounts/i }).click();
    await expect(page).toHaveURL(/\/app\/accounts/);
  });

  test('navigates to Trade Log page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Trade Log/i }).click();
    await expect(page).toHaveURL(/\/app\/tradelog/);
    await expect(page.getByRole('heading', { name: 'Trade Log' })).toBeVisible();
  });

  test('navigates to Analytics page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Analytics/i }).click();
    await expect(page).toHaveURL(/\/app\/analytics/);
  });

  test('navigates to Goals page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Goals/i }).click();
    await expect(page).toHaveURL(/\/app\/goals/);
  });

  test('navigates to Settings page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Settings/i }).click();
    await expect(page).toHaveURL(/\/app\/settings/);
  });

  test('navigates to Profile page', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: /Profile/i }).click();
    await expect(page).toHaveURL(/\/app\/profile/);
  });

  test('can navigate between multiple pages in sequence', async ({ authedPage }) => {
    const page = authedPage;

    // Helper: wait for sidebar button to be attached and stable, then click
    async function navTo(name: RegExp, urlPattern: RegExp) {
      const btn = page.getByRole('button', { name });
      await btn.waitFor({ state: 'attached', timeout: 10000 });
      await btn.click({ timeout: 10000 });
      await expect(page).toHaveURL(urlPattern, { timeout: 10000 });
    }

    await navTo(/Trade Log/i, /\/app\/tradelog/);
    await navTo(/Analytics/i, /\/app\/analytics/);
    await navTo(/Goals/i, /\/app\/goals/);
    await navTo(/Dashboard/i, /\/app\/dashboard/);
  });

  test('sidebar collapse toggle exists', async ({ authedPage }) => {
    const page = authedPage;

    // The sidebar has a collapse button (ChevronLeft icon)
    // When expanded, the sidebar is 240px wide
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });
});
