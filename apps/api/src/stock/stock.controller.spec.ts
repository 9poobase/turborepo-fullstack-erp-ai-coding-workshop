import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { StockController } from './stock.controller.js';

async function createController(stockBalance: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [StockController],
    providers: [{ provide: PrismaService, useValue: { stockBalance } }],
  }).compile();
  return moduleRef.get(StockController);
}

/** A Prisma StockBalance row with its product (and the product's thresholds) joined in. */
function row(overrides: Record<string, unknown> = {}) {
  const product = {
    sku: 'SKU003',
    name: 'Laundry detergent',
    unit: 'ถุง',
    thresholds: [{ storeCode: 'B01', threshold: 3 }],
    ...((overrides.product as Record<string, unknown>) ?? {}),
  };
  const { product: _ignored, ...rest } = overrides;
  return {
    id: 'bal1',
    productId: 'prd3',
    storeCode: 'B01',
    quantity: 0,
    product,
    ...rest,
  };
}

describe('StockController', () => {
  it('searches stock balances newest-first with the paginated envelope', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    await expect(call(controller.search(), { page: 1, pageSize: 20 })).resolves.toMatchObject({
      items: [
        {
          productId: 'prd3',
          sku: 'SKU003',
          productName: 'Laundry detergent',
          storeCode: 'B01',
          quantity: 0,
          unit: 'ถุง',
          threshold: 3,
          lowStock: true,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
        include: { product: { include: { thresholds: true } } },
      }),
    );
  });

  it('flags a product as low-stock when quantity is at or below the store threshold', async () => {
    const findMany = vi.fn().mockResolvedValue([row({ quantity: 3 })]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    const result = await call(controller.search(), { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ quantity: 3, threshold: 3, lowStock: true });
  });

  it('does not flag a product above its threshold', async () => {
    const findMany = vi.fn().mockResolvedValue([row({ quantity: 24 })]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    const result = await call(controller.search(), { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ quantity: 24, threshold: 3, lowStock: false });
  });

  it('reports a null threshold and never low-stock when the store has no reorder point', async () => {
    const findMany = vi.fn().mockResolvedValue([row({ quantity: 0, product: { thresholds: [] } })]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    const result = await call(controller.search(), { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ threshold: null, lowStock: false });
  });

  it('filters by store code and a free-text term over SKU and product name', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    await call(controller.search(), { page: 1, pageSize: 20, q: 'SKU003', storeCode: 'B01' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeCode: { equals: 'B01', mode: 'insensitive' },
          product: {
            OR: [
              { sku: { contains: 'SKU003', mode: 'insensitive' } },
              { name: { contains: 'SKU003', mode: 'insensitive' } },
            ],
          },
        },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: {
        storeCode: { equals: 'B01', mode: 'insensitive' },
        product: {
          OR: [
            { sku: { contains: 'SKU003', mode: 'insensitive' } },
            { name: { contains: 'SKU003', mode: 'insensitive' } },
          ],
        },
      },
    });
  });

  it('applies no filters when neither a term nor a store is given', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const controller = await createController({ findMany, count });

    await call(controller.search(), { page: 1, pageSize: 20 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('picks the threshold matching the balance store, ignoring other stores', async () => {
    const findMany = vi.fn().mockResolvedValue([
      row({
        quantity: 2,
        storeCode: 'B02',
        product: {
          thresholds: [
            { storeCode: 'B01', threshold: 3 },
            { storeCode: 'B02', threshold: 5 },
          ],
        },
      }),
    ]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    const result = await call(controller.search(), { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ storeCode: 'B02', threshold: 5, lowStock: true });
  });

  it('exposes no edit or delete path for the ledger at the controller seam', async () => {
    const controller = await createController({ findMany: vi.fn(), count: vi.fn() });

    // The append-only ledger is read-only from this surface: the only route is `search`.
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(controller)).filter(
      (name) => name !== 'constructor',
    );
    expect(methods).toEqual(['search']);
  });
});
