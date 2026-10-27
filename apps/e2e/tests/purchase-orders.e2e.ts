import { expect, test, type Page } from '@playwright/test';
import { storageState } from './accounts.js';

/** A far-future date that is unlikely to be shared with another run, so a row is easy to find. */
function uniqueDate() {
  const n = Date.now();
  const month = String((n % 12) + 1).padStart(2, '0');
  const day = String((Math.floor(n / 12) % 28) + 1).padStart(2, '0');
  return `2031-${month}-${day}`;
}

async function fillHeader(page: Page, date: string) {
  await page.getByLabel('ผู้จัดจำหน่าย', { exact: true }).fill('SUP01');
  await page.getByLabel('สาขาปลายทาง', { exact: true }).fill('B01');
  await page.getByLabel('วันที่คาดว่าจะได้รับสินค้า', { exact: true }).fill(date);
}

async function fillLine(page: Page, n: number, sku: string, quantity: string, price: string) {
  await page.getByLabel(`รหัสสินค้า (SKU) ${n}`, { exact: true }).fill(sku);
  await page.getByLabel(`จำนวนที่สั่ง ${n}`, { exact: true }).fill(quantity);
  await page.getByLabel(`ราคาซื้อต่อหน่วย (บาท) ${n}`, { exact: true }).fill(price);
}

test.describe('purchase order drafting', () => {
  test.use({ storageState: storageState('buyer') });

  // Demo: Draft a PO for SUP01 → B01 with 20 packs of SKU001 at 45.00; a line repeating SKU001 is rejected.
  test('draft a PO for SUP01 to B01 with 20 packs of SKU001 at 45.00, a repeated SKU001 line is rejected', async ({
    page,
  }) => {
    const date = uniqueDate();

    await page.goto('/purchase-orders');
    await fillHeader(page, date);
    await fillLine(page, 1, 'SKU001', '20', '45');
    await page.getByRole('button', { name: 'บันทึกฉบับร่าง' }).click();

    const row = page.getByRole('row', { name: new RegExp(date) }).first();
    await expect(row).toContainText('SUP01');
    await expect(row).toContainText('B01');
    await expect(row).toContainText('SKU001 × 20 @ 45.00');
    await expect(row).toContainText('ฉบับร่าง');

    await fillHeader(page, date);
    await fillLine(page, 1, 'SKU001', '20', '45');
    await page.getByRole('button', { name: '+ เพิ่มรายการสินค้า' }).click();
    await fillLine(page, 2, 'SKU001', '5', '45');
    await page.getByRole('button', { name: 'บันทึกฉบับร่าง' }).click();

    await expect(page.getByRole('alert')).toContainText('SKU001');
    await expect(page.getByRole('alert')).toContainText('ซ้ำ');
  });

  test('edit a draft PO and see the new quantity', async ({ page }) => {
    const date = uniqueDate();

    await page.goto('/purchase-orders');
    await fillHeader(page, date);
    await fillLine(page, 1, 'SKU001', '20', '45');
    await page.getByRole('button', { name: 'บันทึกฉบับร่าง' }).click();

    const row = page.getByRole('row', { name: new RegExp(date) }).first();
    await expect(row).toContainText('SKU001 × 20 @ 45.00');
    await row.getByRole('button', { name: 'แก้ไข' }).click();

    await page.getByLabel('จำนวนที่สั่ง 1', { exact: true }).fill('30');
    await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click();

    await expect(page.getByRole('row', { name: new RegExp(date) }).first()).toContainText(
      'SKU001 × 30 @ 45.00',
    );
  });
});
