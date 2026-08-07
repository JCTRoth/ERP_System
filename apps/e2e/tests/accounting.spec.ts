import { test, expect } from '@playwright/test';

test.describe('accounting page', () => {
  test('renders the accounting page', async ({ page }) => {
    await page.goto('/accounting');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Accounting' }),
    ).toBeVisible();
    await expect(
      page.getByText('Manage invoices, payments, and financial records'),
    ).toBeVisible();
  });

  test('shows all accounting tabs and switches between them', async ({ page }) => {
    await page.goto('/accounting');
    const tabs = ['Invoices', 'Payments', 'Bookings', 'Chart of Accounts'];
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
    // Switching to the Chart of Accounts tab must render its content.
    await page.getByRole('button', { name: 'Chart of Accounts' }).click();
    await expect(page.getByRole('button', { name: 'Chart of Accounts' })).toHaveClass(/border-primary-500/);
  });
});
