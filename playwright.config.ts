import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets a run start its own dev server when 8080 is taken.
const port = Number(process.env.E2E_PORT ?? 8080);

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
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `bun run dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Fake pool: e2e seeds a signed-in session (e2e/fixtures/auth.ts) and mocks the API, so Cognito is never called.
    env: { VITE_COGNITO_USER_POOL_ID: 'us-east-1_e2etest', VITE_COGNITO_CLIENT_ID: 'e2eclientid' },
  },
});
