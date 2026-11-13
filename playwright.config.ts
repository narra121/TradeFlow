import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  // The dev server compiles each lazy route on first visit; a cold route can take several seconds.
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Fake pool: e2e seeds a signed-in session (e2e/fixtures/auth.ts) and mocks the API, so Cognito is never called.
    env: { VITE_COGNITO_USER_POOL_ID: 'us-east-1_e2etest', VITE_COGNITO_CLIENT_ID: 'e2eclientid' },
  },
});
