import { test, expect } from '@playwright/test';

test.describe('users page', () => {
  test('renders the users table with seeded users', async ({ page }) => {
    await page.goto('/users');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Users & Groups' }),
    ).toBeVisible();
    // Seeded super admin must be listed (loaded from the gateway).
    await expect(page.getByText('admin@erp-system.local').first()).toBeVisible();
  });

  test('opens the add-user modal', async ({ page }) => {
    await page.goto('/users');
    await page.getByRole('button', { name: 'Add User' }).click();
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});
