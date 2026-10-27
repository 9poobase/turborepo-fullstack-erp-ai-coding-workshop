import { describe, expect, it } from 'vitest';
import {
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  purchaseOrdersContract,
} from './purchase-orders.js';

const validCreate = {
  supplierCode: 'SUP01',
  storeCode: 'B01',
  expectedReceiptDate: '2026-02-01',
  lines: [{ sku: 'SKU001', quantity: 20, unitPrice: 45 }],
};

describe('CreatePurchaseOrderSchema', () => {
  it('accepts the Section 8.1 demo order: SUP01 to B01, 20 of SKU001 at 45.00', () => {
    expect(CreatePurchaseOrderSchema.safeParse(validCreate).success).toBe(true);
  });

  it('accepts a zero unit price', () => {
    const lines = [{ sku: 'SKU001', quantity: 1, unitPrice: 0 }];
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines }).success).toBe(true);
  });

  it('rejects an order with no lines', () => {
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines: [] }).success).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects an ordered quantity of %s', (quantity) => {
    const lines = [{ sku: 'SKU001', quantity, unitPrice: 45 }];
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines }).success).toBe(false);
  });

  it('rejects a negative unit price', () => {
    const lines = [{ sku: 'SKU001', quantity: 20, unitPrice: -0.01 }];
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines }).success).toBe(false);
  });

  it('rejects the same SKU on two lines and points at the repeated line', () => {
    const lines = [
      { sku: 'SKU001', quantity: 20, unitPrice: 45 },
      { sku: 'SKU002', quantity: 5, unitPrice: 10 },
      { sku: 'SKU001', quantity: 3, unitPrice: 45 },
    ];
    const result = CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['lines', 2, 'sku'],
        message: expect.stringContaining('SKU001'),
      }),
    ]);
  });

  it('accepts different SKUs on different lines', () => {
    const lines = [
      { sku: 'SKU001', quantity: 20, unitPrice: 45 },
      { sku: 'SKU002', quantity: 5, unitPrice: 10 },
    ];
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, lines }).success).toBe(true);
  });

  it.each(['', '01/02/2026', '2026-02-30', '2026-02-01T00:00:00Z'])(
    'rejects an expected receipt date of %j',
    (expectedReceiptDate) => {
      expect(
        CreatePurchaseOrderSchema.safeParse({ ...validCreate, expectedReceiptDate }).success,
      ).toBe(false);
    },
  );

  it('rejects a missing supplier or destination store', () => {
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, supplierCode: '' }).success).toBe(
      false,
    );
    expect(CreatePurchaseOrderSchema.safeParse({ ...validCreate, storeCode: '' }).success).toBe(
      false,
    );
  });
});

describe('UpdatePurchaseOrderSchema', () => {
  it('targets the order by id and applies the same line rules', () => {
    expect(UpdatePurchaseOrderSchema.safeParse({ id: 'po1', ...validCreate }).success).toBe(true);
    expect(UpdatePurchaseOrderSchema.safeParse(validCreate).success).toBe(false);
    expect(
      UpdatePurchaseOrderSchema.safeParse({
        id: 'po1',
        ...validCreate,
        lines: [
          { sku: 'SKU001', quantity: 20, unitPrice: 45 },
          { sku: 'SKU001', quantity: 1, unitPrice: 45 },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('purchaseOrdersContract', () => {
  it('exposes list, get, create and update routes', () => {
    expect(Object.keys(purchaseOrdersContract).sort()).toEqual([
      'create',
      'get',
      'list',
      'update',
    ]);
  });
});
