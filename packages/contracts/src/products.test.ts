import { describe, expect, it } from 'vitest';
import { CreateProductSchema, ProductSchema, UpdateProductSchema } from './products.js';

const validProduct = {
  id: 'prd1',
  sku: 'SKU001',
  name: 'Drinking water pack of 6',
  category: 'เครื่องดื่ม',
  unit: 'แพ็ค',
  sellingPrice: 60,
  active: true,
  thresholds: [{ storeCode: 'B01', threshold: 3 }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const validCreate = {
  sku: 'SKU001',
  name: 'Drinking water pack of 6',
  category: 'เครื่องดื่ม',
  unit: 'แพ็ค',
  sellingPrice: 60,
  active: true,
  thresholds: [{ storeCode: 'B01', threshold: 3 }],
};

describe('ProductSchema', () => {
  it('accepts a complete product', () => {
    expect(ProductSchema.safeParse(validProduct).success).toBe(true);
  });
});

describe('CreateProductSchema', () => {
  it('accepts a product with all fields and per-store thresholds', () => {
    expect(CreateProductSchema.safeParse(validCreate).success).toBe(true);
  });

  it('accepts a product with no thresholds', () => {
    expect(CreateProductSchema.safeParse({ ...validCreate, thresholds: [] }).success).toBe(true);
  });

  it('rejects an empty SKU', () => {
    expect(CreateProductSchema.safeParse({ ...validCreate, sku: '' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(CreateProductSchema.safeParse({ ...validCreate, name: '' }).success).toBe(false);
  });

  it('rejects a negative selling price', () => {
    expect(CreateProductSchema.safeParse({ ...validCreate, sellingPrice: -1 }).success).toBe(false);
  });

  it('accepts a zero selling price', () => {
    expect(CreateProductSchema.safeParse({ ...validCreate, sellingPrice: 0 }).success).toBe(true);
  });

  it('rejects a negative reorder threshold', () => {
    expect(
      CreateProductSchema.safeParse({
        ...validCreate,
        thresholds: [{ storeCode: 'B01', threshold: -1 }],
      }).success,
    ).toBe(false);
  });

  it('rejects a non-integer reorder threshold', () => {
    expect(
      CreateProductSchema.safeParse({
        ...validCreate,
        thresholds: [{ storeCode: 'B01', threshold: 1.5 }],
      }).success,
    ).toBe(false);
  });

  it('rejects a threshold with an empty store code', () => {
    expect(
      CreateProductSchema.safeParse({
        ...validCreate,
        thresholds: [{ storeCode: '', threshold: 3 }],
      }).success,
    ).toBe(false);
  });
});

describe('UpdateProductSchema', () => {
  it('requires an id plus the editable fields', () => {
    expect(UpdateProductSchema.safeParse({ id: 'prd1', ...validCreate }).success).toBe(true);
  });

  it('rejects a missing id', () => {
    expect(UpdateProductSchema.safeParse(validCreate).success).toBe(false);
  });
});
