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

// Mock API responses so the app can render without a real backend.
// The app uses RTK Query with base URL like:
//   https://<id>.execute-api.us-east-1.amazonaws.com/tradequt-dev/v1
// Routes are matched with glob pattern to cover both dev and prod API URLs.
async function mockAPIRoutes(page: Page) {
  // Mock the trades endpoint
  await page.route('**/v1/trades**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], message: 'OK' }),
    });
  });

  // Mock accounts endpoint
  await page.route('**/v1/accounts**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
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
        message: 'OK',
      }),
    });
  });

  // Mock saved options endpoint
  await page.route('**/v1/saved-options**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {}, message: 'OK' }),
    });
  });

  // Mock subscription endpoint
  await page.route('**/v1/subscription**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { plan: 'free', status: 'active' },
        message: 'OK',
      }),
    });
  });

  // Mock goals endpoint
  await page.route('**/v1/goals**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], message: 'OK' }),
    });
  });

  // Mock rules endpoint
  await page.route('**/v1/rules**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], message: 'OK' }),
    });
  });

  // Mock analytics endpoint
  await page.route('**/v1/analytics**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {}, message: 'OK' }),
    });
  });

  // Mock stats endpoint (used by Dashboard + Analytics views)
  await page.route('**/v1/stats**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
          grossProfit: 0, grossLoss: 0, totalPnl: 0, totalVolume: 0,
          winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
          expectancy: 0, avgRiskReward: 0, bestTrade: 0, worstTrade: 0,
          avgHoldingTime: 0, minDuration: 0, maxDuration: 0,
          consecutiveWins: 0, consecutiveLosses: 0, maxDrawdown: 0, sharpeRatio: 0,
          durationBuckets: [], symbolDistribution: {}, strategyDistribution: {},
          sessionDistribution: {}, outcomeDistribution: {},
          hourlyStats: [], dailyWinRate: [], dailyPnl: [],
        },
        message: 'OK',
      }),
    });
  });

  // Mock goals progress endpoint (used by Goals view)
  await page.route('**/v1/goals/progress**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          goalProgress: {
            profit: { current: 0, target: 500, progress: 0, achieved: false },
            winRate: { current: 0, target: 65, progress: 0, achieved: false },
            maxDrawdown: { current: 0, target: 3, progress: 0, achieved: true },
            tradeCount: { current: 0, target: 8, progress: 0, achieved: true },
          },
          ruleCompliance: { totalRules: 0, followedCount: 0, brokenRulesCounts: {} },
          goals: [],
          rules: [],
        },
        message: 'OK',
      }),
    });
  });

  // Mock rules-goals endpoint (used by Goals view for CRUD)
  await page.route('**/v1/rules-goals**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { rules: [], goals: [] },
        message: 'OK',
      }),
    });
  });

  // Mock user profile endpoint
  await page.route('**/v1/user**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 'test-user-id-123', name: 'Test User', email: 'test@example.com' },
        message: 'OK',
      }),
    });
  });

  // Mock token refresh endpoint
  await page.route('**/v1/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { IdToken: createFakeJWT() },
        message: 'OK',
      }),
    });
  });

  // Catch-all for any other API v1 routes
  await page.route('**/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null, message: 'OK' }),
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
