import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WaterMart E2E tests.
 *
 * Assumes the storefront is running at http://localhost:3000
 * and the admin panel at http://localhost:3001.
 *
 * Usage:
 *   npx playwright test
 *   npx playwright test --ui
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.STOREFRONT_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the dev servers before running, if not already running
  webServer: process.env.CI
    ? []
    : [
        {
          command: 'cd apps/storefront && pnpm dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'cd apps/admin && pnpm dev',
          url: 'http://localhost:3001',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
