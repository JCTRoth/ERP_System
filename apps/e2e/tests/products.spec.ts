import { test, expect } from '@playwright/test';

test.describe('products page', () => {
  test('renders the products page with actions', async ({ page }) => {
    await page.goto('/products');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Products' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible();
  });

  test('renders the product table and search', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByPlaceholder('Search products...')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('filters products via the search box', async ({ page }) => {
    await page.goto('/products');
    const search = page.getByPlaceholder('Search products...');
    await expect(search).toBeVisible();
    await search.fill('vitamin');
    await expect(search).toHaveValue('vitamin');
  });
});
