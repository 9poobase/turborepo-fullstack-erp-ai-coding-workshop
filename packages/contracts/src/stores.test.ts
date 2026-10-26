import { describe, expect, it } from 'vitest';
import { CreateStoreSchema, StoreSchema, UpdateStoreSchema } from './stores.js';

const validStore = {
  id: 's1',
  code: 'B01',
  name: 'Central Store',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('StoreSchema', () => {
  it('accepts a complete store', () => {
    expect(StoreSchema.safeParse(validStore).success).toBe(true);
  });
});

describe('CreateStoreSchema', () => {
  it('accepts a code and name', () => {
    expect(CreateStoreSchema.safeParse({ code: 'B01', name: 'Central Store' }).success).toBe(true);
  });

  it('rejects an empty code', () => {
    expect(CreateStoreSchema.safeParse({ code: '', name: 'Central Store' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(CreateStoreSchema.safeParse({ code: 'B01', name: '' }).success).toBe(false);
  });

  it('does not accept an id (server-assigned)', () => {
    const result = CreateStoreSchema.safeParse({ id: 's1', code: 'B01', name: 'Central Store' });

    expect(result.success).toBe(true);
    if (result.success) expect('id' in result.data).toBe(false);
  });
});

describe('UpdateStoreSchema', () => {
  it('requires an id plus the editable fields', () => {
    expect(
      UpdateStoreSchema.safeParse({ id: 's1', code: 'B01', name: 'Renamed Store' }).success,
    ).toBe(true);
  });

  it('rejects a missing id', () => {
    expect(UpdateStoreSchema.safeParse({ code: 'B01', name: 'Renamed Store' }).success).toBe(false);
  });
});
