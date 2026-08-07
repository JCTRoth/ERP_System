import { test, expect } from '@playwright/test';
import { adminUser } from '../utils/test-users';

test.describe('dashboard', () => {
  test('shows the welcome heading after login', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeVisible();
  });

  test('greets the logged-in admin user by first name', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: new RegExp(adminUser.firstName),
      }),
    ).toBeVisible();
  });

  test('shows the logged-in user in the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(adminUser.email).first()).toBeVisible();
  });
});
