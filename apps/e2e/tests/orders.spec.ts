import { test, expect } from '@playwright/test';

test.describe('orders page', () => {
  test('renders the orders page with actions', async ({ page }) => {
    await page.goto('/orders');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Orders' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Order' })).toBeVisible();
  });

  test('shows the status filter', async ({ page }) => {
    await page.goto('/orders');
    // The status <select> is the only combobox on the page (before opening the
    // create-order modal); "all" + 6 statuses.
    const statusFilter = page.getByRole('combobox');
    await expect(statusFilter).toBeVisible();
    await expect(statusFilter.locator('option')).toHaveCount(7);
  });

  test('opens the create-order modal', async ({ page }) => {
    await page.goto('/orders');
    await page.getByRole('button', { name: 'Create Order' }).click();
    // The modal heading (distinct from the header button with the same label).
    await expect(
      page.getByRole('heading', { level: 2, name: 'Create Order' }),
    ).toBeVisible();
  });
});
