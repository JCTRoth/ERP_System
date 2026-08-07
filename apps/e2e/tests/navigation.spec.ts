import { test, expect } from '@playwright/test';

const NAV_LABELS = [
  'Dashboard',
  'Products',
  'Orders',
  'Accounting',
  'Master Data',
  'Templates',
  'Translations',
  'UI Builder',
  'Companies',
  // NOTE: the translation service overrides nav.users to "Users" (local
  // fallback is "Users & Groups"); substring matching handles both.
  'Users',
  'Settings',
];

test.describe('sidebar navigation', () => {
  test('renders the main navigation items', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    for (const label of NAV_LABELS) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('navigates to pages via sidebar links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');

    await nav.getByRole('link', { name: 'Companies' }).click();
    await expect(page).toHaveURL(/\/companies/);

    await nav.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL(/\/users/);

    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
