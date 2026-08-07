import { defineConfig, devices } from '@playwright/test';
import { AUTH_STORAGE_STATE } from './utils/paths';

const CI = !!process.env.CI;

// Base URLs — override via env vars (e.g., point at the docker compose stack in CI).
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const WEBSHOP_URL = process.env.E2E_WEBSHOP_URL || 'http://localhost:3008';

/**
 * Playwright E2E configuration for the ERP System.
 *
 * AUTH-FIRST + FAIL-FAST:
 *  - The `setup` project runs BEFORE every test project and contains the
 *    authentication flow as its very first test (see tests/auth.setup.ts).
 *  - If the auth test fails, Playwright automatically skips all projects that
 *    depend on `setup` and (with `maxFailures: 1` + `workers: 1`) the whole
 *    run stops immediately — no other test executes.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  maxFailures: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    // Force English UI labels and a fixed timezone so assertions are
    // deterministic regardless of the runner's locale (the app detects the
    // browser language and renders localized labels).
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // AUTH-FIRST: the setup project is the first to execute. The very first
    // test in it performs the login and saves the session (storage state).
    // If it fails, every dependent project is skipped -> suite stops.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Main authenticated suite (ERP frontend).
    {
      name: 'chromium',
      testIgnore: /(auth\.setup|webshop\.spec)\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    // Webshop storefront smoke tests (public pages, no login required).
    {
      name: 'webshop',
      testMatch: /webshop\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: WEBSHOP_URL,
      },
      dependencies: ['setup'],
    },
  ],
  // Local development: automatically start the frontend and webshop dev
  // servers. The backend stack must be running first (scripts/dev/start-local.sh).
  // In CI the full stack is provided by docker compose (see .github/workflows/ci-cd.yml),
  // so no dev servers are started and `reuseExistingServer` semantics apply via env.
  webServer: CI
    ? undefined
    : [
        {
          command: 'npm --workspace @erp/frontend run dev',
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npm --workspace @erp/webshop run dev',
          url: WEBSHOP_URL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
