import { describe, expect, it } from 'vitest';
import { ApiErrorDataSchema, PaginationQuerySchema, paginated } from './common.js';
import * as z from 'zod';

describe('PaginationQuerySchema', () => {
  it('defaults to page 1 and pageSize 20', () => {
    const result = PaginationQuerySchema.parse({});

    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('rejects a page below 1', () => {
    expect(PaginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects a pageSize above 100', () => {
    expect(PaginationQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it('accepts explicit page and pageSize', () => {
    expect(PaginationQuerySchema.parse({ page: 3, pageSize: 50 })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });
});

describe('paginated', () => {
  it('wraps items with total, page and pageSize', () => {
    const schema = paginated(z.object({ id: z.string() }));
    const result = schema.safeParse({
      items: [{ id: 'a' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    expect(result.success).toBe(true);
  });

  it('rejects items that do not match the element schema', () => {
    const schema = paginated(z.object({ id: z.string() }));

    expect(schema.safeParse({ items: [{ id: 1 }], total: 1, page: 1, pageSize: 20 }).success).toBe(
      false,
    );
  });
});

describe('ApiErrorDataSchema', () => {
  it('accepts a Thai message with kind input', () => {
    const result = ApiErrorDataSchema.safeParse({ messageTh: 'รหัสซ้ำ', kind: 'input' });

    expect(result.success).toBe(true);
  });

  it('accepts kind retry', () => {
    expect(ApiErrorDataSchema.safeParse({ messageTh: 'ลองใหม่', kind: 'retry' }).success).toBe(
      true,
    );
  });

  it('rejects an unknown kind', () => {
    expect(
      ApiErrorDataSchema.safeParse({ messageTh: 'x', kind: 'fatal' }).success,
    ).toBe(false);
  });
});
