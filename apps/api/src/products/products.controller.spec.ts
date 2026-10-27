import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { ProductsController } from './products.controller.js';

async function createController(product: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProductsController],
    providers: [{ provide: PrismaService, useValue: { product } }],
  }).compile();
  return moduleRef.get(ProductsController);
}

/** Shape of a Prisma unique-constraint violation (code P2002), as the client throws it. */
function duplicateSkuError() {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target: ['sku'] },
  });
}

/** Prisma returns Decimal columns as a Decimal instance; emulate its toString/toNumber behaviour. */
function decimal(value: number) {
  return { toString: () => value.toString(), toNumber: () => value };
}

/** A Prisma Product row with its thresholds relation, as findMany/create/update return it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prd1',
    sku: 'SKU001',
    name: 'Drinking water pack of 6',
    category: 'เครื่องดื่ม',
    unit: 'แพ็ค',
    sellingPrice: decimal(60),
    active: true,
    thresholds: [{ storeCode: 'B01', threshold: 3 }],
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

const input = {
  sku: 'SKU001',
  name: 'Drinking water pack of 6',
  category: 'เครื่องดื่ม',
  unit: 'แพ็ค',
  sellingPrice: 60,
  active: true,
  thresholds: [{ storeCode: 'B01', threshold: 3 }],
};

describe('ProductsController', () => {
  it('creates a product with its per-store thresholds and serializes price to a number', async () => {
    const create = vi.fn().mockResolvedValue(row());
    const controller = await createController({ create });

    await expect(call(controller.create(), input)).resolves.toMatchObject({
      id: 'prd1',
      sku: 'SKU001',
      sellingPrice: 60,
      active: true,
      thresholds: [{ storeCode: 'B01', threshold: 3 }],
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        sku: 'SKU001',
        name: 'Drinking water pack of 6',
        category: 'เครื่องดื่ม',
        unit: 'แพ็ค',
        sellingPrice: 60,
        active: true,
        thresholds: { create: [{ storeCode: 'B01', threshold: 3 }] },
      },
      include: { thresholds: true },
    });
  });

  it('edits a product by id, replacing its thresholds', async () => {
    const update = vi.fn().mockResolvedValue(row({ name: 'Renamed' }));
    const controller = await createController({ update });

    await expect(
      call(controller.update(), { id: 'prd1', ...input, name: 'Renamed' }),
    ).resolves.toMatchObject({ name: 'Renamed' });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'prd1' },
      data: {
        sku: 'SKU001',
        name: 'Renamed',
        category: 'เครื่องดื่ม',
        unit: 'แพ็ค',
        sellingPrice: 60,
        active: true,
        thresholds: { deleteMany: {}, create: [{ storeCode: 'B01', threshold: 3 }] },
      },
      include: { thresholds: true },
    });
  });

  it('rejects a duplicate SKU with a Thai conflict error', async () => {
    const create = vi.fn().mockRejectedValue(duplicateSkuError());
    const controller = await createController({ create });

    await expect(call(controller.create(), input)).rejects.toMatchObject({
      code: 'CONFLICT',
      data: { kind: 'input', messageTh: expect.stringContaining('SKU001') },
    });
  });

  it('lists products newest-first with the paginated envelope', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    await expect(call(controller.list(), { page: 1, pageSize: 20 })).resolves.toMatchObject({
      items: [
        { sku: 'SKU001', sellingPrice: 60, thresholds: [{ storeCode: 'B01', threshold: 3 }] },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
      include: { thresholds: true },
    });
  });

  it('returns an active product when resolving a SKU for a new document', async () => {
    const findUnique = vi.fn().mockResolvedValue(row({ active: true }));
    const controller = await createController({ findUnique });

    await expect(call(controller.forDocument(), { sku: 'SKU001' })).resolves.toMatchObject({
      sku: 'SKU001',
      active: true,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { sku: 'SKU001' },
      include: { thresholds: true },
    });
  });

  it('rejects an inactive product from being added to a new document', async () => {
    const findUnique = vi.fn().mockResolvedValue(row({ active: false }));
    const controller = await createController({ findUnique });

    await expect(call(controller.forDocument(), { sku: 'SKU001' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      data: { kind: 'input', messageTh: expect.stringContaining('SKU001') },
    });
  });

  it('reports a missing SKU as not found when resolving for a document', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const controller = await createController({ findUnique });

    await expect(call(controller.forDocument(), { sku: 'NOPE' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
