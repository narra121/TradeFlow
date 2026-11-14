import { test, expect } from '@playwright/test';

test.describe('Authentication - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form with the landmarks and gate selectors', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Log in to TradeQut' })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();

    await expect(page.locator('input[type=email]')).toBeVisible();
    await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page.locator('button[type=submit]')).toHaveText('Log in');

    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  });

  test('has no Remember me control; the sample dashboard sits beside the form at desktop width', async ({ page }) => {
    await expect(page.getByText(/remember me/i)).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'What TradeQut looks like' }).getByText('Sample data')).toBeVisible();
  });

  test('email and password fields accept input', async ({ page }) => {
    await page.locator('input[type=email]').fill('user@test.com');
    await page.locator('input[type=password]').fill('testpassword123');
    await expect(page.locator('input[type=email]')).toHaveValue('user@test.com');
    await expect(page.locator('input[type=password]')).toHaveValue('testpassword123');
  });

  test('the Show button reveals the password', async ({ page }) => {
    const password = page.getByRole('textbox', { name: 'Password' });
    await expect(page.locator('input[type=password]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('an empty submit shows a summary and inline errors', async ({ page }) => {
    await page.locator('button[type=submit]').click();
    await expect(page.getByRole('alert')).toContainText('2 fields need attention');
    await expect(page.locator('input[type=email]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Create account in the header opens signup', async ({ page }) => {
    await page.getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('the logo links to the site and the footer has the legal links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'TradeQut home' })).toHaveAttribute('href', '/');
    for (const name of ['Privacy', 'Terms', 'Security', 'Status']) {
      await expect(page.getByRole('navigation', { name: 'Legal and status' }).getByRole('link', { name })).toBeVisible();
    }
  });

  test('shows the session-ended notice after a forced logout', async ({ page }) => {
    await page.goto('/login?reason=session-ended');
    await expect(page.getByRole('status').first()).toContainText('You were logged out because your session ended.');
  });

  test('the signed-out view confirms the log out and offers Log in again', async ({ page }) => {
    await page.goto('/login?view=logged-out');
    await expect(page.getByRole('heading', { level: 1, name: "You're logged out" })).toBeFocused();
    await page.getByRole('link', { name: 'Log in again' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[type=email]')).toBeFocused();
  });

  test('a cancelled Google sign-in says so and prints nothing from the URL', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied&error_description=CALL+0800+123');
    await expect(page.getByRole('heading', { level: 1, name: 'Google sign-in was cancelled' })).toBeVisible();
    await expect(page.getByText('0800')).toHaveCount(0);
  });
});

test.describe('Authentication - Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('asks for email and password only, beside the sample-data panel', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
    await expect(page.locator('input[type=email]')).toBeVisible();
    await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);
    await expect(page.getByLabel('Confirm password')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('complementary').getByText('Sample data')).toBeVisible();
    // CONTRACT revision 4 (owner, 2026-11-13): a 14-day free trial with every Pro feature, no Free plan.
    await expect(page.getByText('14-day free trial. No card.')).toBeVisible();
  });

  test('Log in in the header opens login', async ({ page }) => {
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows the real password policy as a checklist that ticks while typing', async ({ page }) => {
    await page.locator('input[type=password]').fill('abcdefgh');
    const list = page.getByRole('list', { name: 'Password requirements' });
    await expect(list).toContainText('At least 8 characters (met)');
    await expect(list).toContainText('A symbol, like ! or # (not met yet)');
  });

  test('blocks a password without a symbol and names the unmet rule', async ({ page }) => {
    await page.locator('input[type=email]').fill('trader@example.com');
    await page.locator('input[type=password]').fill('Passw0rd');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert')).toContainText('add a symbol, like ! or #');
  });
});

test.describe('Authentication - Redirect', () => {
  test('redirects to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when accessing any /app/* route without auth', async ({ page }) => {
    await page.goto('/app/tradelog');
    await expect(page).toHaveURL(/\/login/);
  });
});
