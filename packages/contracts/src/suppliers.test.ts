import { describe, expect, it } from 'vitest';
import { CreateSupplierSchema, SupplierSchema, UpdateSupplierSchema } from './suppliers.js';

const validSupplier = {
  id: 'sup1',
  code: 'SUP01',
  name: 'SupplyOne Co Ltd',
  contact: 'Khun A, 02-000-0000',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('SupplierSchema', () => {
  it('accepts a complete supplier', () => {
    expect(SupplierSchema.safeParse(validSupplier).success).toBe(true);
  });
});

describe('CreateSupplierSchema', () => {
  it('accepts code, name and contact', () => {
    expect(
      CreateSupplierSchema.safeParse({
        code: 'SUP01',
        name: 'SupplyOne Co Ltd',
        contact: 'Khun A, 02-000-0000',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty code', () => {
    expect(
      CreateSupplierSchema.safeParse({ code: '', name: 'SupplyOne', contact: 'x' }).success,
    ).toBe(false);
  });

  it('rejects an empty contact', () => {
    expect(
      CreateSupplierSchema.safeParse({ code: 'SUP01', name: 'SupplyOne', contact: '' }).success,
    ).toBe(false);
  });
});

describe('UpdateSupplierSchema', () => {
  it('requires an id plus the editable fields', () => {
    expect(
      UpdateSupplierSchema.safeParse({
        id: 'sup1',
        code: 'SUP01',
        name: 'SupplyOne',
        contact: 'x',
      }).success,
    ).toBe(true);
  });

  it('rejects a missing id', () => {
    expect(
      UpdateSupplierSchema.safeParse({ code: 'SUP01', name: 'SupplyOne', contact: 'x' }).success,
    ).toBe(false);
  });
});
