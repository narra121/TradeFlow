import { test, expect } from './fixtures/auth';

test.describe('Trades', () => {
  // These tests edit trades, so the user is in an active trial: the shared mock's plan 'free' is a trial that has ended (read-only).
  test.beforeEach(async ({ authedPage: page }) => {
    const in10Days = new Date(Date.now() + 10 * 86_400_000).toISOString();
    await page.route('**/v1/me/entitlements', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entitlements: { plan: 'trial', status: 'trial', trialEndsAt: in10Days, limits: { ai_extract: 200, ai_insight: 30, ai_chat: 500, broker_import: 200, ai_enhance: 500 }, features: {} },
            usage: {},
            periodResetsAt: in10Days,
            writableAccountIds: null,
          },
        }),
      }),
    );
  });

  test('lists the trades grouped by day and counts them in the top bar', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await expect(page.getByRole('row').filter({ has: page.getByText('EURUSD') })).toBeVisible();
    await expect(page.getByRole('rowheader').first()).toBeVisible();
    await expect(page.getByRole('banner').getByText('6', { exact: true }).first()).toBeVisible();
  });

  test('a row opens the trade in the docked pane through the URL and closing removes it', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('row').filter({ has: page.getByText('EURUSD') }).click();
    await expect(page).toHaveURL(/\?trade=t-1/);
    const pane = page.getByRole('complementary', { name: 'Trade' });
    await expect(pane.getByRole('heading', { name: /EURUSD/ })).toBeVisible();
    await pane.getByRole('button', { name: 'Close trade' }).click();
    await expect(page).not.toHaveURL(/trade=/);
  });

  test('Esc closes the docked pane and focus returns to the row that opened it', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    const row = page.getByRole('row').filter({ has: page.getByText('EURUSD') });
    await row.click();
    await expect(page).toHaveURL(/trade=t-1/);
    await expect(page.getByRole('complementary', { name: 'Trade' }).getByRole('heading', { name: /EURUSD/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/trade=/);
    await expect(row).toBeFocused();
  });

  test('Esc clears a selection, and the table is one tab stop', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('checkbox', { name: /^Select EURUSD/ }).check();
    await expect(page.getByRole('toolbar', { name: 'Selected trades' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('toolbar', { name: 'Selected trades' })).toHaveCount(0);
    expect(await page.locator('tbody tr[data-row-id][tabindex="0"]').count()).toBe(1);
  });

  test('a deep link to a trade opens its pane after a reload', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog?trade=t-3');
    await expect(page.getByRole('heading', { name: /NAS100/ }).last()).toBeVisible();
  });

  test('Add trade opens the new-trade form in the pane', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('button', { name: 'Add trade' }).click();
    await expect(page).toHaveURL(/\?trade=new/);
    await expect(page.getByRole('heading', { name: 'New trade' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save trade' })).toBeVisible();
  });

  test('a drill-down link applies one removable filter and offers the way back', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog?src=analytics&strategy=Reversal');
    await expect(page.getByRole('button', { name: 'Remove filter: From Analytics: Strategy = Reversal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Analytics' })).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByText('GBPJPY') })).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByText('EURUSD') })).toHaveCount(0);
    await page.getByRole('button', { name: /Remove filter/ }).click();
    await expect(page).not.toHaveURL(/strategy=/);
    await expect(page.getByRole('row').filter({ has: page.getByText('EURUSD') })).toBeVisible();
  });

  test('selecting a row shows the bulk bar with the count', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('checkbox', { name: /^Select EURUSD/ }).check();
    await expect(page.getByRole('toolbar', { name: 'Selected trades' })).toContainText('1 selected');
  });

  test('find narrows the list by symbol', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByPlaceholder(/Find/).fill('nifty');
    await expect(page.getByRole('row').filter({ has: page.getByText('NIFTY', { exact: true }) })).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByText('EURUSD') })).toHaveCount(0);
  });

  // The picker saves through POST /trades/bulk-update, where the server sets only the named field; no PUT rewrites the whole trade.
  test('S on a focused row picks a strategy and saves only that field through bulk-update', async ({ authedPage: page, apiCalls }) => {
    const sent: unknown[] = [];
    await page.route('**/v1/trades/bulk-update', async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { updatedIds: ['t-1'], failed: [], notFound: [] } }) });
    });
    await page.goto('/app/tradelog');
    const row = page.getByRole('row').filter({ has: page.getByText('EURUSD') });
    await row.focus();
    await page.keyboard.press('s');
    await page.getByRole('combobox', { name: 'Strategy' }).waitFor();
    await page.getByRole('option', { name: 'Reversal' }).click();
    await expect.poll(() => sent[0]).toMatchObject({ tradeIds: ['t-1'], set: { setupType: 'Reversal' } });
    await expect(row.getByRole('button', { name: /Change strategy/ })).toContainText('Reversal');
    expect(apiCalls.filter((c) => c.method === 'PUT' && c.path === '/trades/t-1')).toHaveLength(0);
  });

  test('clicking a journal cell opens the same picker; a number cell has no edit affordance', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    const row = page.getByRole('row').filter({ has: page.getByText('EURUSD') });
    await row.getByRole('button', { name: /Change strategy/ }).click();
    await expect(page.getByRole('combobox', { name: 'Strategy' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(row.getByRole('button', { name: /^Change (entry|exit|qty|net)/i })).toHaveCount(0);
  });

  test('? opens the shortcut sheet grouped by scope and F6 moves between regions', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('heading', { level: 1, name: 'Trades' }).waitFor();
    await page.keyboard.press('?');
    const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    for (const scope of ['Everywhere', 'Lists', 'Trade pane and forms']) await expect(sheet.getByRole('region', { name: scope })).toBeVisible();
    await expect(sheet.getByText('Strategy picker for the row or the selection')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('F6');
    await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(await page.evaluate(() => document.activeElement?.textContent ?? ''));
  });

  test('?find= and ?view= from the palette fill Find and open a saved view, then leave the URL clean', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog?find=nifty&view=winners');
    await expect(page.getByPlaceholder(/Find/)).toHaveValue('nifty');
    await expect(page).not.toHaveURL(/find=|view=/);
    await expect(page.getByRole('banner').getByRole('button', { name: /Winners/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('offline: the scope bar says so and in-place journal fields stop being editable', async ({ authedPage: page, context }) => {
    await page.goto('/app/tradelog?trade=t-1');
    await expect(page.getByRole('button', { name: /^Edit strategy/ })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: /Refresh data\. Offline/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Edit strategy/ })).toHaveCount(0);
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: /^Edit strategy/ })).toBeVisible();
  });

  test('deleting a trade from its row menu needs no dialog and Undo restores it', async ({ authedPage: page, apiCalls }) => {
    await page.goto('/app/tradelog');
    const row = page.getByRole('row').filter({ has: page.getByText('EURUSD') });
    await row.hover();
    await row.getByRole('button', { name: /^Actions for EURUSD/ }).click();
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(row).toHaveCount(0);
    expect(apiCalls.some((c) => c.method === 'DELETE' && c.path === '/trades/t-1')).toBe(true);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => apiCalls.find((c) => c.method === 'POST' && c.path === '/trades/restore')?.body).toEqual({ tradeIds: ['t-1'] });
    await expect(row).toBeVisible();
  });

  test('Jump to opens the palette and Enter goes to the chosen screen', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('heading', { level: 1, name: 'Trades' }).waitFor();
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('calendar');
    await expect(page.getByRole('option', { name: /Go to Calendar/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/app\/calendar/);
  });

  test('the help menu lists guide, shortcuts, news, support, feedback and status', async ({ authedPage: page }) => {
    await page.goto('/app/tradelog');
    await page.getByRole('button', { name: /^Help/ }).click();
    for (const name of ['Guide', 'Keyboard shortcuts', "What's new", 'Contact support', 'Send feedback', 'System status']) {
      await expect(page.getByRole('menuitem', { name: new RegExp(name) })).toBeVisible();
    }
  });
});
