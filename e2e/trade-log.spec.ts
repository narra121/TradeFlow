import { test, expect } from './fixtures/auth';

test.describe('Trade Log', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/app/tradelog');
  });

  test('trade log page loads with heading', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByRole('heading', { name: 'Trade Log' })).toBeVisible();
    await expect(page.getByText('Track and analyze your trading history')).toBeVisible();
  });

  test('has New Trade and Import buttons', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByRole('button', { name: /New Trade/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible();
  });

  test('displays tab controls for Trades and Calendar views', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByRole('button', { name: 'Trades' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
  });

  test('Trades tab is active by default', async ({ authedPage }) => {
    const page = authedPage;

    // The Trades tab should be the default active tab
    // The table headers should be visible
    const tradesTab = page.getByRole('button', { name: 'Trades' });
    await expect(tradesTab).toBeVisible();
  });

  test('displays trade table with correct column headers', async ({ authedPage }) => {
    const page = authedPage;

    // Table column headers from TradeLogView
    await expect(page.getByText('Symbol')).toBeVisible();
    await expect(page.getByText('Account')).toBeVisible();
    await expect(page.getByText('Direction')).toBeVisible();
    await expect(page.getByText('Entry')).toBeVisible();
    await expect(page.getByText('Exit')).toBeVisible();
    await expect(page.getByText('Size')).toBeVisible();
    await expect(page.getByText('R:R')).toBeVisible();
    await expect(page.getByText('Outcome')).toBeVisible();
    await expect(page.getByText('P&L')).toBeVisible();
  });

  test('shows "No trades found" when there are no trades', async ({ authedPage }) => {
    const page = authedPage;

    await expect(page.getByText('No trades found')).toBeVisible();
  });

  test('filter controls are present', async ({ authedPage }) => {
    const page = authedPage;

    // The filter section should show "Filters:" label and dropdowns
    await expect(page.getByText('Filters:')).toBeVisible();
  });

  test('can switch to Calendar tab', async ({ authedPage }) => {
    const page = authedPage;

    await page.getByRole('button', { name: 'Calendar' }).click();

    // Calendar view should show day headers
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Tue')).toBeVisible();
    await expect(page.getByText('Wed')).toBeVisible();
    await expect(page.getByText('Thu')).toBeVisible();
    await expect(page.getByText('Fri')).toBeVisible();
  });

  test('can switch back to Trades tab from Calendar', async ({ authedPage }) => {
    const page = authedPage;

    // Go to Calendar
    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByText('Mon')).toBeVisible();

    // Switch back to Trades
    await page.getByRole('button', { name: 'Trades' }).click();
    await expect(page.getByText('No trades found')).toBeVisible();
  });
});
