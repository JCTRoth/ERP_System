import { test, expect } from '@playwright/test';

test.describe('master data page', () => {
  test('renders the master data page', async ({ page }) => {
    await page.goto('/masterdata');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Master Data' }),
    ).toBeVisible();
    await expect(
      page.getByText('Manage master data entities and relationships'),
    ).toBeVisible();
  });

  test('shows all master data tabs', async ({ page }) => {
    await page.goto('/masterdata');
    const tabs = ['Customers', 'Suppliers', 'Employees', 'Assets', 'Reference Data'];
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });
});
