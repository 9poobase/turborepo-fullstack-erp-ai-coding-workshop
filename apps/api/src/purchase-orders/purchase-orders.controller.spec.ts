import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import type { User } from '@erp/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';

const buyer: User = {
  id: 'u-buyer',
  email: 'buyer01@erp.local',
  name: 'Buyer 01',
  role: 'PURCHASING_OFFICER',
  storeCode: null,
};

/** Prisma returns Decimal columns as a Decimal instance; emulate its toNumber behaviour. */
function decimal(value: number) {
  return { toString: () => value.toString(), toNumber: () => value };
}

const supplier = { code: 'SUP01', name: 'SupplyOne Co Ltd' };
const store = { code: 'B01', name: 'Central Store' };
const sku001 = { id: 'prd1', sku: 'SKU001', name: 'Drinking water pack of 6', unit: 'แพ็ค', active: true };
const sku002 = { id: 'prd2', sku: 'SKU002', name: 'Tissue paper', unit: 'แพ็ค', active: true };

/** A PurchaseOrder row with its lines, as create/update/findUnique/findMany return it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'po1',
    status: 'DRAFT',
    supplierCode: 'SUP01',
    supplierName: 'SupplyOne Co Ltd',
    storeCode: 'B01',
    storeName: 'Central Store',
    expectedReceiptDate: new Date('2026-02-01T00:00:00.000Z'),
    createdById: 'u-buyer',
    lines: [
      {
        sku: 'SKU001',
        productName: 'Drinking water pack of 6',
        unit: 'แพ็ค',
        quantity: 20,
        unitPrice: decimal(45),
      },
    ],
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

const input = {
  supplierCode: 'SUP01',
  storeCode: 'B01',
  expectedReceiptDate: '2026-02-01',
  lines: [{ sku: 'SKU001', quantity: 20, unitPrice: 45 }],
};

/** A Prisma stub with every collaborator the controller needs; override only what a test cares about. */
function makePrisma(overrides: Record<string, Record<string, unknown>> = {}) {
  return {
    supplier: { findUnique: vi.fn().mockResolvedValue(supplier) },
    store: { findUnique: vi.fn().mockResolvedValue(store) },
    product: { findMany: vi.fn().mockResolvedValue([sku001]) },
    purchaseOrder: {
      create: vi.fn().mockResolvedValue(row()),
      findUnique: vi.fn().mockResolvedValue(row()),
      update: vi.fn().mockResolvedValue(row()),
      findMany: vi.fn().mockResolvedValue([row()]),
      count: vi.fn().mockResolvedValue(1),
    },
    stockBalance: { upsert: vi.fn(), update: vi.fn(), create: vi.fn() },
    stockMovement: { create: vi.fn() },
    ...overrides,
  };
}

async function createController(prisma: ReturnType<typeof makePrisma>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [PurchaseOrdersController],
    providers: [{ provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(PurchaseOrdersController);
}

describe('PurchaseOrdersController.create', () => {
  it('drafts a PO for SUP01 to B01 with 20 packs of SKU001 at 45.00', async () => {
    const prisma = makePrisma();
    const controller = await createController(prisma);

    await expect(call(controller.create(buyer), input)).resolves.toEqual({
      id: 'po1',
      status: 'DRAFT',
      supplierCode: 'SUP01',
      supplierName: 'SupplyOne Co Ltd',
      storeCode: 'B01',
      storeName: 'Central Store',
      expectedReceiptDate: '2026-02-01',
      lines: [
        {
          sku: 'SKU001',
          productName: 'Drinking water pack of 6',
          unit: 'แพ็ค',
          quantity: 20,
          unitPrice: 45,
        },
      ],
      createdById: 'u-buyer',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(prisma.purchaseOrder.create).toHaveBeenCalledWith({
      data: {
        status: 'DRAFT',
        supplierCode: 'SUP01',
        supplierName: 'SupplyOne Co Ltd',
        storeCode: 'B01',
        storeName: 'Central Store',
        expectedReceiptDate: new Date('2026-02-01T00:00:00.000Z'),
        createdById: 'u-buyer',
        lines: {
          create: [
            {
              productId: 'prd1',
              sku: 'SKU001',
              productName: 'Drinking water pack of 6',
              unit: 'แพ็ค',
              quantity: 20,
              unitPrice: 45,
            },
          ],
        },
      },
      include: { lines: { orderBy: { sku: 'asc' } } },
    });
  });

  it('never changes stock when drafting', async () => {
    const prisma = makePrisma();
    const controller = await createController(prisma);

    await call(controller.create(buyer), input);

    expect(prisma.stockBalance.upsert).not.toHaveBeenCalled();
    expect(prisma.stockBalance.update).not.toHaveBeenCalled();
    expect(prisma.stockBalance.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects a line that repeats SKU001 and saves nothing', async () => {
    const prisma = makePrisma();
    const controller = await createController(prisma);
    const lines = [
      { sku: 'SKU001', quantity: 20, unitPrice: 45 },
      { sku: 'SKU001', quantity: 5, unitPrice: 45 },
    ];

    await expect(call(controller.create(buyer), { ...input, lines })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown supplier with a Thai not-found error', async () => {
    const prisma = makePrisma({ supplier: { findUnique: vi.fn().mockResolvedValue(null) } });
    const controller = await createController(prisma);

    await expect(call(controller.create(buyer), input)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      data: { kind: 'input', messageTh: expect.stringContaining('SUP01') },
    });
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown destination store with a Thai not-found error', async () => {
    const prisma = makePrisma({ store: { findUnique: vi.fn().mockResolvedValue(null) } });
    const controller = await createController(prisma);

    await expect(call(controller.create(buyer), input)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      data: { kind: 'input', messageTh: expect.stringContaining('B01') },
    });
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('rejects a SKU that does not exist', async () => {
    const prisma = makePrisma({ product: { findMany: vi.fn().mockResolvedValue([]) } });
    const controller = await createController(prisma);

    await expect(call(controller.create(buyer), input)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      data: { kind: 'input', messageTh: expect.stringContaining('SKU001') },
    });
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive product, which cannot enter a new document', async () => {
    const prisma = makePrisma({
      product: { findMany: vi.fn().mockResolvedValue([{ ...sku001, active: false }]) },
    });
    const controller = await createController(prisma);

    await expect(call(controller.create(buyer), input)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      data: { kind: 'input', messageTh: expect.stringContaining('SKU001') },
    });
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });
});

describe('PurchaseOrdersController.update', () => {
  const edit = {
    id: 'po1',
    supplierCode: 'SUP01',
    storeCode: 'B01',
    expectedReceiptDate: '2026-02-15',
    lines: [
      { sku: 'SKU001', quantity: 30, unitPrice: 44.5 },
      { sku: 'SKU002', quantity: 4, unitPrice: 10 },
    ],
  };

  it('edits a draft, replacing its date and lines', async () => {
    const edited = row({
      expectedReceiptDate: new Date('2026-02-15T00:00:00.000Z'),
      lines: [
        {
          sku: 'SKU001',
          productName: 'Drinking water pack of 6',
          unit: 'แพ็ค',
          quantity: 30,
          unitPrice: decimal(44.5),
        },
        { sku: 'SKU002', productName: 'Tissue paper', unit: 'แพ็ค', quantity: 4, unitPrice: decimal(10) },
      ],
    });
    const prisma = makePrisma({
      product: { findMany: vi.fn().mockResolvedValue([sku001, sku002]) },
      purchaseOrder: {
        ...makePrisma().purchaseOrder,
        update: vi.fn().mockResolvedValue(edited),
      },
    });
    const controller = await createController(prisma);

    await expect(call(controller.update(), edit)).resolves.toMatchObject({
      id: 'po1',
      status: 'DRAFT',
      expectedReceiptDate: '2026-02-15',
      lines: [
        { sku: 'SKU001', quantity: 30, unitPrice: 44.5 },
        { sku: 'SKU002', quantity: 4, unitPrice: 10 },
      ],
    });
    expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'po1', status: 'DRAFT' },
      data: {
        supplierCode: 'SUP01',
        supplierName: 'SupplyOne Co Ltd',
        storeCode: 'B01',
        storeName: 'Central Store',
        expectedReceiptDate: new Date('2026-02-15T00:00:00.000Z'),
        lines: {
          deleteMany: {},
          create: [
            {
              productId: 'prd1',
              sku: 'SKU001',
              productName: 'Drinking water pack of 6',
              unit: 'แพ็ค',
              quantity: 30,
              unitPrice: 44.5,
            },
            {
              productId: 'prd2',
              sku: 'SKU002',
              productName: 'Tissue paper',
              unit: 'แพ็ค',
              quantity: 4,
              unitPrice: 10,
            },
          ],
        },
      },
      include: { lines: { orderBy: { sku: 'asc' } } },
    });
  });

  it('rejects an edit once the order has left Draft', async () => {
    const prisma = makePrisma({
      purchaseOrder: {
        ...makePrisma().purchaseOrder,
        findUnique: vi.fn().mockResolvedValue(row({ status: 'APPROVED' })),
      },
    });
    const controller = await createController(prisma);

    await expect(call(controller.update(), edit)).rejects.toMatchObject({
      code: 'CONFLICT',
      data: { kind: 'input' },
    });
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('rejects the edit when the order leaves Draft between the check and the write', async () => {
    const lost = Object.assign(new Error('Record to update not found'), { code: 'P2025' });
    const prisma = makePrisma({
      product: { findMany: vi.fn().mockResolvedValue([sku001, sku002]) },
      purchaseOrder: {
        ...makePrisma().purchaseOrder,
        update: vi.fn().mockRejectedValue(lost),
      },
    });
    const controller = await createController(prisma);

    await expect(call(controller.update(), edit)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects an edit of an order that does not exist', async () => {
    const prisma = makePrisma({
      purchaseOrder: {
        ...makePrisma().purchaseOrder,
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const controller = await createController(prisma);

    await expect(call(controller.update(), edit)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('rejects an edit that repeats a SKU', async () => {
    const prisma = makePrisma();
    const controller = await createController(prisma);
    const lines = [
      { sku: 'SKU001', quantity: 30, unitPrice: 45 },
      { sku: 'SKU001', quantity: 4, unitPrice: 45 },
    ];

    await expect(call(controller.update(), { ...edit, lines })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });
});

describe('PurchaseOrdersController.list and get', () => {
  it('lists orders newest-first with the paginated envelope', async () => {
    const prisma = makePrisma();
    const controller = await createController(prisma);

    await expect(call(controller.list(), { page: 2, pageSize: 10 })).resolves.toMatchObject({
      items: [{ id: 'po1', status: 'DRAFT', lines: [{ sku: 'SKU001', unitPrice: 45 }] }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
      include: { lines: { orderBy: { sku: 'asc' } } },
    });
  });

  it('gets one order by id', async () => {
    const controller = await createController(makePrisma());

    await expect(call(controller.get(), { id: 'po1' })).resolves.toMatchObject({ id: 'po1' });
  });

  it('answers not-found for an unknown id', async () => {
    const prisma = makePrisma({
      purchaseOrder: {
        ...makePrisma().purchaseOrder,
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const controller = await createController(prisma);

    await expect(call(controller.get(), { id: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
