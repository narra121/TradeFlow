import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/auth';
import { APP_ROUTES } from './app-routes.spec';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

const SURFACES: [name: string, path: string][] = [
  ...APP_ROUTES.map(([p, t]) => [t, `/app/${p}`] as [string, string]),
  ['Trades with the trade pane open', '/app/tradelog?trade=t-1'],
  ['Trades with the new-trade form', '/app/tradelog?trade=new'],
];

for (const [label, size] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 375, height: 812 }]] as const) {
  test.describe(`axe, WCAG 2.2 AA, ${label}`, () => {
    test.use({ viewport: size });
    for (const [name, path] of SURFACES) {
      test(`${name} has no serious or critical violations`, async ({ authedPage: page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.locator('h1, [data-testid=trade-pane]').first().waitFor({ state: 'attached' });
        expect(await violations(page)).toEqual([]);
      });
    }
  });
}

test('the command palette and the help menu pass axe', async ({ authedPage: page }) => {
  await page.goto('/app/tradelog');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search commands' }).waitFor();
  expect(await violations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Help/ }).click();
  await page.getByRole('menuitem', { name: 'Guide' }).waitFor();
  expect(await violations(page)).toEqual([]);
});
