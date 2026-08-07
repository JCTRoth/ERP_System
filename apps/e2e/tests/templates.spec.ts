import { test, expect } from '@playwright/test';

test.describe('templates page', () => {
  test('renders the templates page with actions', async ({ page }) => {
    await page.goto('/templates');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Templates' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Template' })).toBeVisible();
  });

  test('shows search and filters', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.getByPlaceholder('Search templates...')).toBeVisible();
    // Language and document-type filters (always rendered, independent of data).
    await expect(page.getByRole('combobox')).toHaveCount(2);
    const docTypeFilter = page.getByRole('combobox').nth(1);
    // Select options are hidden until the dropdown opens, so assert by value.
    await expect(docTypeFilter.locator('option[value="invoice"]')).toHaveText('Invoice');
  });

  test('filters templates via the search box', async ({ page }) => {
    await page.goto('/templates');
    const search = page.getByPlaceholder('Search templates...');
    await search.fill('invoice');
    await expect(search).toHaveValue('invoice');
  });
});
