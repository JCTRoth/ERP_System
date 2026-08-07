import { expect, Page } from '@playwright/test';

/**
 * Performs the ERP login flow. Used by the auth setup test — the very first
 * test of the suite — to establish the authenticated session for all other
 * tests (see tests/auth.setup.ts).
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  // exact: true — the "Show password" toggle's aria-label also contains
  // "Password" and would otherwise make getByLabel ambiguous.
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/**
 * Fail-fast guard for authenticated tests.
 *
 * Asserts that the storage state established by the auth setup project is
 * actually valid: the page must not redirect back to the login page. This
 * produces a clear failure message instead of confusing selector timeouts
 * when the session is missing or expired.
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/auth/login'),
    { timeout: 30_000 },
  );
  await expect(page.locator('body')).not.toContainText('Sign In');
}
