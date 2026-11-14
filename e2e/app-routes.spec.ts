import { test, expect } from './fixtures/auth';
import { APP_ROUTES } from './fixtures/routes';

test.describe('App routes', () => {
  for (const [path, title] of APP_ROUTES) {
    test(`/app/${path} shows its title, a skip link and no errors`, async ({ authedPage: page, pageErrors }) => {
      await page.goto(`/app/${path}`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1);
      await expect(page).toHaveTitle(new RegExp(`${title.replace('&', '&')} · TradeQut`));
      expect(pageErrors).toEqual([]);
    });
  }

  test('the sidebar reaches every destination and marks the current page', async ({ authedPage: page }) => {
    await page.goto('/app/dashboard');
    const nav = page.getByRole('navigation').first();
    for (const [path, label] of [['tradelog', 'Trades'], ['calendar', 'Calendar'], ['analytics', 'Analytics'], ['goals', 'Goals & rules'], ['accounts', 'Accounts'], ['import', 'Import']]) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`/app/${path}$`));
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('an unknown app path shows page not found inside the frame', async ({ authedPage: page }) => {
    await page.goto('/app/nothing-here');
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('the avatar menu carries profile, settings, plan, help and log out', async ({ authedPage: page }) => {
      await page.goto('/app/dashboard');
      await page.getByRole('button', { name: /^Account menu/ }).click();
      for (const name of ['Profile', 'Settings', 'Plan & billing', 'Guide', 'Contact support', 'Send feedback', 'Log out']) {
        await expect(page.getByRole('menuitem', { name })).toBeVisible();
      }
    });

    test('the More sheet ends with Help: guide, support, feedback, status', async ({ authedPage: page }) => {
      await page.goto('/app/dashboard');
      await page.getByRole('button', { name: 'More' }).click();
      const sheet = page.getByRole('dialog', { name: 'More' });
      for (const name of ['Guide', 'Contact support', 'Send feedback', 'System status']) await expect(sheet.getByRole(name === 'Guide' || name === 'System status' ? 'link' : 'button', { name })).toBeVisible();
    });

    test('Analytics tabs sit in their own row under the title bar and none is cut off', async ({ authedPage: page }) => {
      await page.goto('/app/analytics');
      const tabs = page.getByRole('navigation', { name: 'Views' });
      await expect(tabs).toBeVisible();
      const box = await tabs.boundingBox();
      expect(box?.height).toBe(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });

  test.describe('touch phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('the trade pane controls and form fields are at least 44 px', async ({ authedPage: page }) => {
      await page.goto('/app/tradelog?trade=t-1');
      const pane = page.getByRole('dialog').or(page.getByTestId('trade-pane')).first();
      await pane.waitFor();
      for (const name of ['Previous trade', 'Next trade', 'More actions', 'Close trade']) {
        const box = await pane.getByRole('button', { name }).boundingBox();
        expect(box?.width, name).toBeGreaterThanOrEqual(44);
        expect(box?.height, name).toBeGreaterThanOrEqual(44);
      }
      const edit = await pane.getByRole('button', { name: 'Edit', exact: true }).boundingBox();
      expect(edit?.height).toBeGreaterThanOrEqual(44);
      await expect(pane.getByText('Long', { exact: true }).locator('visible=true').first()).toBeVisible();
    });
  });
});
