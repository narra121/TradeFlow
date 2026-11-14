import { test, expect, type Page } from '@playwright/test';

/** Console errors that are not defects of the page under test. */
const BENIGN = ['favicon', 'third-party', 'DevTools', 'ERR_FAILED', 'status of 403'];

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !BENIGN.some((b) => msg.text().includes(b))) errors.push(msg.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.describe('Landing page', () => {
  test('loads with the headline and no console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'The trading journal that shows what your rules cost you.' })).toBeVisible();
    // CONTRACT revision 4 (owner, 2026-11-13): a 14-day free trial with every Pro feature, no Free plan.
    await expect(page.getByText('14-day free trial. No card.').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('has no invented social proof', async ({ page }) => {
    await page.goto('/');
    const text = (await page.locator('body').innerText()) ?? '';
    for (const banned of [/10,000\+/, /500K\+/, /4\.9\/5/, /#1 Trading Journal/i, /Marcus Chen|Sarah Johnson|David Kim/]) {
      expect(text).not.toMatch(banned);
    }
  });

  test('header offers Log in and Start free, and the same links on every page', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    await expect(header.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/signup');
    const links = (path: string) => page.goto(path).then(() => page.getByRole('navigation', { name: 'Main' }).getByRole('link').allInnerTexts());
    expect(await links('/pricing')).toEqual(await links('/about'));
  });

  test('shows the Free vs Pro table with a working currency toggle', async ({ page }) => {
    await page.goto('/');
    const pricing = page.getByRole('region', { name: 'Pricing' });
    await expect(pricing.getByText('$4.99')).toBeVisible();
    await pricing.getByRole('radio', { name: 'INR' }).check({ force: true });
    await expect(pricing.getByText('₹499')).toBeVisible();
  });

  // The tabbed product tour was replaced by the hero cursor demo and scroll chapters (DESIGN-SHARED S7.2): the demo is
  // labelled as sample data, and its motion control works from the keyboard (WCAG 2.2.2).
  test('the product demo is labelled as sample data and its motion control is keyboard operable', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section', { has: page.getByRole('heading', { level: 1 }) });
    await expect(hero.getByRole('img', { name: /^Sample data: / })).toBeVisible();
    await expect(hero.getByText('Sample data', { exact: true }).first()).toBeVisible();
    const pause = page.getByRole('button', { name: 'Pause animations' });
    await pause.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Play animations' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('group', { name: 'Chapters' }).getByRole('button')).toHaveCount(3);
  });

  test('works at a phone width: menu opens and nothing overflows horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});

test.describe('Public pages', () => {
  const PAGES: [string, string][] = [
    ['/pricing', 'TradeQut pricing'],
    ['/guide', 'How to use TradeQut'],
    ['/about', 'About TradeQut'],
    ['/contact', 'Contact us'],
    ['/glossary', 'Trading glossary'],
    ['/changelog', 'Changelog'],
    ['/blog', 'Blog'],
    ['/resources', 'Trading calculators'],
    ['/trading-journal-india', 'A trading journal for Indian F&O traders'],
    ['/alternatives', 'Trading journal alternatives compared'],
    ['/status', 'Service status'],
  ];

  for (const [path, heading] of PAGES) {
    test(`${path} renders its heading inside the public frame without errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }

  test('a blog article has its short answer, contents, FAQ and sources', async ({ page }) => {
    await page.goto('/blog/fo-trading-charges-india');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('F&O trading charges in India');
    await expect(page.getByLabel('Short answer')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sources', exact: true })).toBeVisible();
  });

  test('unknown routes show a real not-found page with a way back', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  test('glossary hash links scroll to and focus the term', async ({ page }) => {
    await page.goto('/glossary#drawdown');
    await expect(page.locator('#drawdown')).toBeFocused();
  });
});

test.describe('Legal and company pages', () => {
  test('privacy, terms and refund pages have numbered sections and a contents list', async ({ page }) => {
    for (const [path, title] of [
      ['/privacy', 'Privacy Policy'],
      ['/terms', 'Terms of Service'],
      ['/refund', 'Refund & Cancellation Policy'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Contents' })).toBeVisible();
      await expect(page.getByText(/Last updated/).first()).toBeVisible();
    }
  });

  test('legal text names the services actually used and not the old payment provider', async ({ page }) => {
    await page.goto('/privacy');
    const text = await page.locator('main').innerText();
    expect(text).toContain('Stripe');
    expect(text).toContain('Gemini');
    expect(text).not.toContain('PayU');
    await page.goto('/refund');
    expect(await page.locator('main').innerText()).not.toMatch(/voluntary|nothing changes/i);
  });

  test('contact details are real links', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: 'support@tradequt.com' })).toHaveAttribute('href', 'mailto:support@tradequt.com');
    await expect(page.getByRole('link', { name: '+91 8501018125' })).toHaveAttribute('href', 'tel:+918501018125');
  });

  test('every public page shares the footer with legal links and cookie settings', async ({ page }) => {
    for (const path of ['/', '/about', '/privacy', '/terms', '/refund', '/contact', '/pricing']) {
      await page.goto(path);
      const footer = page.getByRole('contentinfo');
      for (const name of ['Privacy', 'Terms', 'Refunds', 'Contact']) await expect(footer.getByRole('link', { name })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Cookie settings' })).toBeVisible();
    }
  });
});

test.describe('Auth pages open', () => {
  test('login and signup load an email field without console errors', async ({ page }) => {
    for (const path of ['/login', '/signup']) {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await expect(page.locator('input[type=email]')).toBeVisible();
      expect(errors).toEqual([]);
    }
  });
});
