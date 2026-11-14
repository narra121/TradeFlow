import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/auth';
import { APP_ROUTES } from './fixtures/routes';

/**
 * The crawler of E-089 / §0.8: measurements over every app screen, asserted as thresholds.
 * unnamed 0 · small 0 · radii in {0, 2, 4, 6, pill} · ≤ 6 font sizes · 0 blur · 0 gradient.
 */
async function crawl(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
    };
    const nameOf = (el: Element): string => {
      const h = el as HTMLElement;
      const labelled = h.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
      const viaLabel = (el as HTMLInputElement).labels ? [...(el as HTMLInputElement).labels!].map((l) => l.textContent).join(' ') : '';
      return (h.getAttribute('aria-label') || labelled || viaLabel || h.innerText || h.textContent || h.getAttribute('title') || h.querySelector('img')?.getAttribute('alt') || '').trim();
    };
    const interactive = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=checkbox], [role=switch], [role=tab], [role=menuitem], [role=combobox], [role=separator][tabindex]')].filter(visible);
    const unnamed = interactive.filter((el) => !nameOf(el)).map((el) => el.outerHTML.slice(0, 100));
    // WCAG 2.5.8: a target under 24 px passes when the 24 px square around its centre touches no other target.
    const boxes = interactive.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const small = boxes
      .filter(({ el, r }) => {
        if ((el as HTMLButtonElement).disabled) return false;
        // The skip link is visually hidden until it has focus.
        if (el.closest('.sr-only')) return false;
        // Inline links inside a sentence are exempt.
        if (el.tagName === 'A' && el.closest('p, li, dd') && getComputedStyle(el).display === 'inline') return false;
        if (el.closest('label')) return false;
        // Column resize handles: the same function is in the header menu (Narrower / Wider), the 2.5.8 alternative.
        if (el.getAttribute('role') === 'separator') return false;
        if (Math.min(r.width, r.height) >= 24) return false;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return boxes.some((o) => o.el !== el && !o.el.contains(el) && !el.contains(o.el) && o.r.left < cx + 12 && o.r.right > cx - 12 && o.r.top < cy + 12 && o.r.bottom > cy - 12);
      })
      .map(({ el, r }) => `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}] ${Math.round(r.width)}x${Math.round(r.height)}`);

    const all = [...document.querySelectorAll('body *')].filter(visible);
    const radii = new Set<string>();
    const sizes = new Set<number>();
    let blur = 0;
    let gradient = 0;
    for (const el of all) {
      const cs = getComputedStyle(el);
      const rad = cs.borderTopLeftRadius;
      if (rad && rad !== '0px') radii.add(/%$/.test(rad) || parseFloat(rad) >= 999 ? 'pill' : rad);
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
      if (ownText) sizes.add(parseFloat(cs.fontSize));
      if ((cs.backdropFilter && cs.backdropFilter !== 'none') || /blur/.test(cs.filter)) blur++;
      if (/gradient/.test(cs.backgroundImage)) gradient++;
    }
    return { unnamed, small, radii: [...radii], sizes: [...sizes].sort((a, b) => a - b), blur, gradient };
  });
}

const ALLOWED_RADII = new Set(['2px', '4px', '6px', 'pill']);

for (const [label, size] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 375, height: 812 }]] as const) {
  test.describe(`crawler, ${label}`, () => {
    test.use({ viewport: size });
    for (const [path, title] of [...APP_ROUTES, ['tradelog?trade=t-1', 'Trades pane'] as [string, string]]) {
      test(`${title} (/app/${path}) meets the thresholds`, async ({ authedPage: page }) => {
        await page.goto(`/app/${path}`);
        await page.waitForLoadState('networkidle');
        await page.locator('h1, [data-testid=trade-pane]').first().waitFor({ state: 'attached' });
        const m = await crawl(page);
        expect.soft(m.unnamed, 'unnamed controls').toEqual([]);
        expect.soft(m.small, 'targets under 24 px').toEqual([]);
        expect.soft(m.radii.filter((r) => !ALLOWED_RADII.has(r)), 'radii outside {2,4,6,pill}').toEqual([]);
        expect.soft(m.sizes.length, `font sizes ${m.sizes.join(', ')}`).toBeLessThanOrEqual(6);
        expect.soft(m.blur, 'blur').toBe(0);
        expect.soft(m.gradient, 'gradient').toBe(0);
      });
    }
  });
}

test.describe('focus and forced colours', () => {
  test('a focused control is never hidden behind the sticky chrome (WCAG 2.4.11)', async ({ authedPage: page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/app/tradelog');
    await page.getByRole('heading', { level: 1, name: 'Trades' }).waitFor();
    for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
    const hidden = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 6));
      return !!top && top !== el && !el.contains(top) && !top.contains(el);
    });
    expect(hidden).toBe(false);
  });

  test('forced-colors smoke: the frame and the Trades table still render and stay operable', async ({ authedPage: page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/app/tradelog');
    await expect(page.getByRole('heading', { level: 1, name: 'Trades' })).toBeVisible();
    await expect(page.getByRole('row').filter({ has: page.getByText('EURUSD') })).toBeVisible();
    await page.getByRole('row').filter({ has: page.getByText('EURUSD') }).click();
    await expect(page).toHaveURL(/trade=t-1/);
  });
});
