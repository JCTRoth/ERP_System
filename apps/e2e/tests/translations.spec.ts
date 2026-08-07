import { test, expect } from '@playwright/test';

test.describe('translations page', () => {
  test('renders the translations table', async ({ page }) => {
    await page.goto('/translations');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Translations' }),
    ).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('exposes the add-key action', async ({ page }) => {
    await page.goto('/translations');
    await expect(page.getByRole('button', { name: 'Add Key' })).toBeVisible();
  });
});
