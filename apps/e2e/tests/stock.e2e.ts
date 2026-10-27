import { expect, test } from '@playwright/test';
import { storageState } from './accounts.js';

test.describe('stock search', () => {
  test.use({ storageState: storageState('staff') });

  // Demo: With seeded balances, search B01; SKU003 (balance 0, threshold 3) shows as low-stock.
  test('search B01 and see SKU003 flagged low-stock', async ({ page }) => {
    await page.goto('/stock');

    await page.getByLabel('สาขา').fill('B01');

    const row = page.getByRole('row', { name: /SKU003/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('ใกล้หมด');
  });
});
