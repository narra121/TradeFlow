import { test as base, type Page } from '@playwright/test';

/**
 * Generate a fake JWT token for testing purposes.
 * The app checks localStorage for 'idToken' to determine auth state.
 * The token must be a valid JWT structure (header.payload.signature)
 * so the tokenRefreshScheduler can parse it without errors.
 */
function createFakeJWT(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'test-user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      // Set expiration far in the future so the scheduler doesn't trigger refresh
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signature = btoa('fake-signature-for-testing');
  return `${header}.${payload}.${signature}`;
}

/**
 * Inject auth tokens into localStorage before the page loads,
 * and set up route mocking so API calls don't fail in tests.
 */
async function setupAuth(page: Page) {
  // Navigate to the base URL first so we can set localStorage on the correct origin
  await page.goto('/');

  // Set auth tokens in localStorage
  const fakeToken = createFakeJWT();
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem('idToken', token);
      localStorage.setItem('refreshToken', 'fake-refresh-token-for-testing');
    },
    { token: fakeToken }
  );
}

/**
 * Mock API responses so the app can render without a real backend.
 * The app uses RTK Query and calls various endpoints on load.
 */
async function mockAPIRoutes(page: Page) {
  // Mock the trades endpoint
  await page.route('**/api/**/trades**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    });
  });

  // Mock accounts endpoint
  await page.route('**/api/**/accounts**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accounts: [
            {
              id: 'test-account-1',
              name: 'Demo Account',
              type: 'DEMO',
              initialBalance: 10000,
              currency: 'USD',
            },
          ],
        },
        error: null,
      }),
    });
  });

  // Mock saved options endpoint
  await page.route('**/api/**/saved-options**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {}, error: null }),
    });
  });

  // Mock subscription endpoint
  await page.route('**/api/**/subscription**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { plan: 'free', status: 'active' },
        error: null,
      }),
    });
  });

  // Mock goals endpoint
  await page.route('**/api/**/goals**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    });
  });

  // Mock rules endpoint
  await page.route('**/api/**/rules**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    });
  });

  // Mock analytics endpoint
  await page.route('**/api/**/analytics**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {}, error: null }),
    });
  });

  // Mock token refresh endpoint
  await page.route('**/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { IdToken: createFakeJWT() },
        error: null,
      }),
    });
  });

  // Catch-all for any other API routes
  await page.route('**/api/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, error: null }),
    });
  });
}

/**
 * Extended test fixture that provides an authenticated page.
 * Usage: import { test, expect } from '../fixtures/auth';
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await mockAPIRoutes(page);
    await setupAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
