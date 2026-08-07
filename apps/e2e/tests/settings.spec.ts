import { test, expect } from '@playwright/test';

test.describe('settings page', () => {
  test('renders the settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();
    await expect(
      page.getByText('Manage your account and application preferences'),
    ).toBeVisible();
  });

  test('shows the appearance section with theme options', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();
    await expect(page.getByText('Dark', { exact: true })).toBeVisible();
    await expect(page.getByText('Light', { exact: true })).toBeVisible();
  });
});
