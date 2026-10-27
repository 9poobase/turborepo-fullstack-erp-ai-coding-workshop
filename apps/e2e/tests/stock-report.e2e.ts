import { expect, test } from '@playwright/test';
import { storageState } from './accounts.js';

test.describe('stock reports', () => {
  test.use({ storageState: storageState('manager') });

  // Demo: AC-08 (low-stock half) - SKU003 with a B01 balance of 0 appears in the B01 low-stock
  // report because 0 is at or below the threshold of 3.
  test('SKU003 with a B01 balance of 0 appears in the B01 low-stock report', async ({ page }) => {
    await page.goto('/reports/stock');

    await page.getByRole('button', { name: 'สต็อกใกล้หมด' }).click();
    await page.getByLabel('สาขา').fill('B01');

    const row = page.getByRole('row', { name: /SKU003/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('ใกล้หมด');
    // The same store's in-stock products are not low on stock.
    await expect(page.getByRole('row', { name: /SKU001/ })).toHaveCount(0);
  });
});
