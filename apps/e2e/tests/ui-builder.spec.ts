import { test, expect } from '@playwright/test';

test.describe('ui builder page', () => {
  test('renders the ui builder header actions', async ({ page }) => {
    await page.goto('/ui-builder');
    await expect(page.getByRole('button', { name: 'Pages' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('shows the empty canvas with a first-row action', async ({ page }) => {
    await page.goto('/ui-builder');
    await expect(page.getByText('Empty Canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add First Row' })).toBeVisible();
  });

  test('opens the page manager', async ({ page }) => {
    await page.goto('/ui-builder');
    await page.getByRole('button', { name: 'Pages' }).click();
    // Page manager dialog shows existing pages and a create action.
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });
});
