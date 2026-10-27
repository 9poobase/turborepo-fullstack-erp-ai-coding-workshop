import { describe, expect, it } from 'vitest';
import { StockBalanceSchema, StockSearchQuerySchema } from './stock.js';

const validBalance = {
  productId: 'prd1',
  sku: 'SKU003',
  productName: 'Laundry detergent',
  category: 'ของใช้ในบ้าน',
  storeCode: 'B01',
  quantity: 0,
  unit: 'ถุง',
  threshold: 3,
  lowStock: true,
};

describe('StockBalanceSchema', () => {
  it('accepts a complete stock balance row', () => {
    expect(StockBalanceSchema.safeParse(validBalance).success).toBe(true);
  });

  it('accepts a null threshold (no reorder point configured for the store)', () => {
    expect(
      StockBalanceSchema.safeParse({ ...validBalance, threshold: null, lowStock: false }).success,
    ).toBe(true);
  });

  it('rejects a negative quantity', () => {
    expect(StockBalanceSchema.safeParse({ ...validBalance, quantity: -1 }).success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    expect(StockBalanceSchema.safeParse({ ...validBalance, quantity: 1.5 }).success).toBe(false);
  });

  it('rejects a negative threshold', () => {
    expect(StockBalanceSchema.safeParse({ ...validBalance, threshold: -1 }).success).toBe(false);
  });
});

describe('StockSearchQuerySchema', () => {
  it('applies pagination defaults with no filters', () => {
    const result = StockSearchQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts a free-text query and a store filter', () => {
    expect(StockSearchQuerySchema.safeParse({ q: 'SKU003', storeCode: 'B01' }).success).toBe(true);
  });

  it('coerces string pagination params from the query string', () => {
    const result = StockSearchQuerySchema.safeParse({ page: '2', pageSize: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
    }
  });
});
