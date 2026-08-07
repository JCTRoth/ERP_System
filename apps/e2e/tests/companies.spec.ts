import { test, expect } from '@playwright/test';

test.describe('companies page', () => {
  test('renders the companies table with the seeded demo company', async ({ page }) => {
    await page.goto('/companies');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Companies' }),
    ).toBeVisible();
    // MediVita is seeded by the company-service.
    await expect(page.getByText('MediVita').first()).toBeVisible();
  });

  test('opens the add-company modal', async ({ page }) => {
    await page.goto('/companies');
    await page.getByRole('button', { name: 'Add Company' }).click();
    await expect(page.getByLabel(/Name/)).toBeVisible();
    await expect(page.getByLabel(/Slug/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});
