import { test, expect } from '@playwright/test';
import { adminUser, invalidUser } from '../utils/test-users';

/**
 * Authentication edge cases.
 *
 * These tests run inside the authenticated `chromium` project (gated on the
 * auth setup project), but explicitly reset the storage state so they exercise
 * the login page from an unauthenticated perspective.
 */
test.describe('authentication (unauthenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated users to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Sign In' }),
    ).toBeVisible();
  });

  test('renders the login form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows an error for an unknown email', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(invalidUser.email);
    await page.getByLabel('Password', { exact: true }).fill(invalidUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('body')).toContainText(/does not exist/i);
  });

  test('shows an error for an invalid password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(adminUser.email);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('body')).toContainText(/incorrect/i);
  });

  test('navigates to the forgot-password page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });
});

test.describe('authentication (authenticated)', () => {
  test('logs out and returns to the login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Sign In' }),
    ).toBeVisible();
  });
});
