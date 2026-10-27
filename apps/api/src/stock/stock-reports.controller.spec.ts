import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Role, User } from '@erp/contracts';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { type AuthenticatedRequest } from '../auth/auth.decorators.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { createSessionToken, SESSION_COOKIE } from '../auth/session-token.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { StockReportsController } from './stock-reports.controller.js';

async function createController(prisma: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [StockReportsController],
    providers: [{ provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(StockReportsController);
}

/** A Prisma StockBalance row with its product (and the product's thresholds) joined in. */
function row(
  sku: string,
  name: string,
  quantity: number,
  options: { id?: string; storeCode?: string; thresholds?: { storeCode: string; threshold: number }[] } = {},
) {
  const storeCode = options.storeCode ?? 'B01';
  return {
    id: options.id ?? `bal-${sku}-${storeCode}`,
    productId: `prd-${sku}`,
    storeCode,
    quantity,
    product: {
      sku,
      name,
      unit: 'ถุง',
      thresholds: options.thresholds ?? [{ storeCode: 'B01', threshold: 3 }],
    },
  };
}

/**
 * The low-stock report compares each balance with its own store's threshold, which Prisma cannot
 * express as a filter, so the controller selects the matching ids with raw SQL (one query for the
 * page, one for the total) and then loads those rows with their relations.
 */
function lowStockStubs(rows: ReturnType<typeof row>[], total = rows.length) {
  const queryRaw = vi
    .fn()
    .mockResolvedValueOnce(rows.map((r) => ({ id: r.id })))
    .mockResolvedValueOnce([{ count: total }]);
  const findMany = vi.fn().mockResolvedValue(rows);
  return { queryRaw, findMany, prisma: { $queryRaw: queryRaw, stockBalance: { findMany } } };
}

describe('StockReportsController.lowStock', () => {
  it('lists SKU003 (B01 balance 0, threshold 3) because 0 is at or below the threshold', async () => {
    const { prisma } = lowStockStubs([row('SKU003', 'Laundry detergent', 0)]);
    const controller = await createController(prisma);

    const result = await call(controller.lowStock(), { page: 1, pageSize: 20, storeCode: 'B01' });

    expect(result).toMatchObject({
      items: [
        {
          sku: 'SKU003',
          storeCode: 'B01',
          quantity: 0,
          threshold: 3,
          lowStock: true,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('keeps the page order chosen by the id query, not the order Prisma returns rows in', async () => {
    const newest = row('SKU002', 'Tissue paper', 1, { id: 'bal-new' });
    const oldest = row('SKU003', 'Laundry detergent', 0, { id: 'bal-old' });
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'bal-new' }, { id: 'bal-old' }])
      .mockResolvedValueOnce([{ count: 2 }]);
    const findMany = vi.fn().mockResolvedValue([oldest, newest]);
    const controller = await createController({ $queryRaw: queryRaw, stockBalance: { findMany } });

    const result = await call(controller.lowStock(), { page: 1, pageSize: 20 });

    expect(result.items.map((item) => item.sku)).toEqual(['SKU002', 'SKU003']);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ['bal-new', 'bal-old'] } },
      include: { product: { include: { thresholds: true } } },
    });
  });

  it('reports the total across pages and binds the page window and filters as parameters', async () => {
    const { queryRaw, prisma } = lowStockStubs([row('SKU003', 'Laundry detergent', 0)], 41);
    const controller = await createController(prisma);

    const result = await call(controller.lowStock(), {
      page: 3,
      pageSize: 10,
      q: 'SKU003',
      storeCode: 'B01',
    });

    expect(result).toMatchObject({ total: 41, page: 3, pageSize: 10 });
    const [pageQuery, countQuery] = queryRaw.mock.calls.map(([sql]) => sql as { values: unknown[] });
    expect(pageQuery.values).toEqual(expect.arrayContaining(['B01', 'SKU003', 10, 20]));
    expect(countQuery.values).toEqual(expect.arrayContaining(['B01', 'SKU003']));
  });

  it('returns an empty page without loading rows when nothing is low on stock', async () => {
    const queryRaw = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0 }]);
    const findMany = vi.fn();
    const controller = await createController({ $queryRaw: queryRaw, stockBalance: { findMany } });

    await expect(call(controller.lowStock(), { page: 1, pageSize: 20 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('StockReportsController.onHand', () => {
  it('lists balances newest-first in the paginated envelope, zero-stock products included', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        row('SKU003', 'Laundry detergent', 0),
        row('SKU001', 'Drinking water', 24),
      ]);
    const count = vi.fn().mockResolvedValue(2);
    const controller = await createController({ stockBalance: { findMany, count } });

    const result = await call(controller.onHand(), { page: 1, pageSize: 20 });

    expect(result).toMatchObject({
      items: [
        { sku: 'SKU003', quantity: 0, threshold: 3, lowStock: true },
        { sku: 'SKU001', quantity: 24, threshold: 3, lowStock: false },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      }),
    );
  });

  it('filters by store and by a term over SKU and product name', async () => {
    const findMany = vi.fn().mockResolvedValue([row('SKU003', 'Laundry detergent', 0)]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ stockBalance: { findMany, count } });

    await call(controller.onHand(), { page: 1, pageSize: 20, q: 'SKU003', storeCode: 'B01' });

    const where = {
      storeCode: { equals: 'B01', mode: 'insensitive' },
      product: {
        OR: [
          { sku: { contains: 'SKU003', mode: 'insensitive' } },
          { name: { contains: 'SKU003', mode: 'insensitive' } },
        ],
      },
    };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(count).toHaveBeenCalledWith({ where });
  });
});

describe('stock report access', () => {
  const secret = 'test-secret-that-is-at-least-32-characters';

  /** Runs the real AuthGuard for a signed-in user of `role` against one report handler. */
  function canCall(role: Role, route: 'onHand' | 'lowStock') {
    const user: User = { id: 'u1', email: 'u1@erp.local', name: 'U1', role, storeCode: null };
    const guard = new AuthGuard(
      new Reflector(),
      { user: { findUnique: vi.fn().mockResolvedValue(user) } } as unknown as PrismaService,
      { get: () => secret } as unknown as ConfigService<Env, true>,
    );
    const request = {
      headers: { cookie: `${SESSION_COOKIE}=${createSessionToken('u1', secret)}` },
    } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => StockReportsController.prototype[route],
      getClass: () => StockReportsController,
    } as unknown as ExecutionContext;
    return guard.canActivate(context);
  }

  it.each(['onHand', 'lowStock'] as const)('lets a manager and an administrator call %s', async (route) => {
    await expect(canCall('MANAGER', route)).resolves.toBe(true);
    await expect(canCall('ADMIN', route)).resolves.toBe(true);
  });

  it.each(['onHand', 'lowStock'] as const)(
    'rejects a store employee and a purchasing officer calling %s with 403',
    async (route) => {
      await expect(canCall('STORE_EMPLOYEE', route)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(canCall('PURCHASING_OFFICER', route)).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});
