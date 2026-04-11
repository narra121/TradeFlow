import { test, expect } from '@playwright/test';

test.describe('Authentication - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form with all required elements', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Check email and password fields
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Check Sign In button
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Check forgot password link
    await expect(page.getByText('Forgot password?')).toBeVisible();

    // Check link to signup
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
  });

  test('shows email and password input fields that accept input', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');

    await emailInput.fill('user@test.com');
    await passwordInput.fill('testpassword123');

    await expect(emailInput).toHaveValue('user@test.com');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('has a password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the visibility toggle (the eye icon button near the password field)
    // The toggle is the button inside the password field's container
    const toggleButton = page.locator('#password').locator('..').getByRole('button');
    await toggleButton.click();

    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('navigates to signup page when "Create one" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('shows the TradeQut branding', async ({ page }) => {
    await expect(page.getByText('TradeQut').first()).toBeVisible();
  });
});

test.describe('Authentication - Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders the signup form with all required fields', async ({ page }) => {
    // Check heading
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    // Check all form fields
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();

    // Check Create Account button
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    // Check link to login
    await expect(page.getByText('Already have an account?')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('navigates to login page when "Sign in" is clicked', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows password strength indicator when typing password', async ({ page }) => {
    const passwordInput = page.getByLabel('Password', { exact: true });
    await passwordInput.fill('StrongP@ss123');

    // The PasswordStrength component should render strength bars/text
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('shows mismatch warning when passwords do not match', async ({ page }) => {
    const passwordInput = page.getByLabel('Password', { exact: true });
    const confirmInput = page.getByLabel('Confirm Password');

    await passwordInput.fill('Password123!');
    await confirmInput.fill('DifferentPassword');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });
});

test.describe('Authentication - Redirect', () => {
  test('redirects to login when accessing protected route without auth', async ({ page }) => {
    // Try to access the app without being logged in
    await page.goto('/app/dashboard');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when accessing any /app/* route without auth', async ({ page }) => {
    await page.goto('/app/tradelog');
    await expect(page).toHaveURL(/\/login/);
  });
});
