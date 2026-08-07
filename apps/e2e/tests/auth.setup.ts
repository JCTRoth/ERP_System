import { test as setup, expect } from '@playwright/test';
import { adminUser } from '../utils/test-users';
import { login } from '../utils/auth-helpers';
import { AUTH_STORAGE_STATE } from '../utils/paths';

/**
 * AUTH-FIRST + FAIL-FAST
 * ----------------------
 * This file runs in the dedicated `setup` project, which Playwright executes
 * BEFORE every test project. The authentication flow is therefore always the
 * very first test of the suite.
 *
 * If this test fails, Playwright automatically skips all projects that depend
 * on `setup` (chromium, webshop) and — combined with `maxFailures: 1` and
 * `workers: 1` in playwright.config.ts — the whole run stops immediately.
 * No other test is executed when authentication fails.
 */
setup.describe.configure({ mode: 'serial' });

setup('authenticate as admin and persist session', async ({ page }) => {
  await login(page, adminUser.email, adminUser.password);

  // A successful login lands on the dashboard ("/").
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /welcome back/i }),
  ).toBeVisible();

  // Persist the session (cookies + localStorage) for all dependent projects.
  await page.context().storageState({ path: AUTH_STORAGE_STATE });
});
