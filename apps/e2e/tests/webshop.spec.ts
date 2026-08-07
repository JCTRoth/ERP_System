import { test, expect } from '@playwright/test';

/**
 * Webshop storefront smoke tests. The webshop is a public, customer-facing
 * application and does not require authentication, but it is still gated on
 * the auth setup project so that the whole suite stops if authentication
 * fails (fail-fast requirement).
 */
test.describe('webshop storefront', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Hero title from the webshop i18n (English locale is forced in the config).
    await expect(
      page.getByRole('heading', { level: 1, name: /buying/i }),
    ).toBeVisible();
  });

  test('lists products on the catalog page', async ({ page }) => {
    await page.goto('/products');
    await expect(
      page.getByRole('heading', { level: 1, name: 'All Products' }),
    ).toBeVisible();
    // Seeded demo products are served by the shop-service through the gateway.
    await expect(page.getByText(/product/i).first()).toBeVisible();
  });

  test('renders the shopping cart page', async ({ page }) => {
    await page.goto('/cart');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Shopping Cart' }),
    ).toBeVisible();
  });
});
