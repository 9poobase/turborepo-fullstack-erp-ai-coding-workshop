import { Controller } from '@nestjs/common';
import { contract, type PurchaseOrder, type User } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { apiError, isRecordNotFoundError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';

/** A Prisma Decimal exposes toNumber(); fall back to Number() for plain values. */
type DecimalLike = { toNumber: () => number };

type PurchaseOrderRow = {
  id: string;
  status: PurchaseOrder['status'];
  supplierCode: string;
  supplierName: string;
  storeCode: string;
  storeName: string;
  expectedReceiptDate: Date;
  createdById: string;
  lines: {
    sku: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: DecimalLike | number;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

/** Lines come back sorted by SKU so the order is stable between reads. */
const withLines = { lines: { orderBy: { sku: 'asc' as const } } };

function toNumber(value: DecimalLike | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

/** Serialize a Prisma row into the contract shape (price as number, dates as strings). */
function toPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    status: row.status,
    supplierCode: row.supplierCode,
    supplierName: row.supplierName,
    storeCode: row.storeCode,
    storeName: row.storeName,
    // A @db.Date column comes back as UTC midnight, so the first ten characters are the date.
    expectedReceiptDate: row.expectedReceiptDate.toISOString().slice(0, 10),
    lines: row.lines.map((line) => ({
      sku: line.sku,
      productName: line.productName,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: toNumber(line.unitPrice),
    })),
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type DraftInput = {
  supplierCode: string;
  storeCode: string;
  expectedReceiptDate: string;
  lines: { sku: string; quantity: number; unitPrice: number }[];
};

const notDraft = () =>
  apiError('CONFLICT', 'แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่างเท่านั้น', 'input');

@Controller()
export class PurchaseOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up the supplier, store and products a draft refers to and build the fields to save. The
   * names and units are snapshotted so later master-data edits never rewrite the document. An
   * unknown reference is not-found; an inactive product cannot enter a new document.
   */
  private async resolveDraft(input: DraftInput) {
    const supplier = await this.prisma.supplier.findUnique({ where: { code: input.supplierCode } });
    if (!supplier) {
      throw apiError('NOT_FOUND', `ไม่พบผู้จัดจำหน่ายรหัส "${input.supplierCode}"`, 'input');
    }
    const store = await this.prisma.store.findUnique({ where: { code: input.storeCode } });
    if (!store) {
      throw apiError('NOT_FOUND', `ไม่พบสาขารหัส "${input.storeCode}"`, 'input');
    }

    const products = await this.prisma.product.findMany({
      where: { sku: { in: input.lines.map((line) => line.sku) } },
    });
    const lines = input.lines.map((line) => {
      const product = products.find((p) => p.sku === line.sku);
      if (!product) {
        throw apiError('NOT_FOUND', `ไม่พบสินค้ารหัส (SKU) "${line.sku}"`, 'input');
      }
      if (!product.active) {
        throw apiError(
          'BAD_REQUEST',
          `สินค้ารหัส (SKU) "${line.sku}" ถูกปิดการใช้งาน ไม่สามารถเพิ่มลงในเอกสารใหม่ได้`,
          'input',
        );
      }
      return {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        unit: product.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      };
    });

    return {
      supplierCode: supplier.code,
      supplierName: supplier.name,
      storeCode: store.code,
      storeName: store.name,
      expectedReceiptDate: new Date(`${input.expectedReceiptDate}T00:00:00.000Z`),
      lines,
    };
  }

  @Implement(contract.purchaseOrders.list)
  list() {
    return implement(contract.purchaseOrders.list).handler(async ({ input }) => {
      const { page, pageSize } = input;
      const [rows, total] = await Promise.all([
        this.prisma.purchaseOrder.findMany({
          // Newest-first, with id as a stable tiebreaker so pagination can't repeat or skip rows.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: withLines,
        }),
        this.prisma.purchaseOrder.count(),
      ]);
      return { items: rows.map(toPurchaseOrder), total, page, pageSize };
    });
  }

  @Implement(contract.purchaseOrders.get)
  get() {
    return implement(contract.purchaseOrders.get).handler(async ({ input }) => {
      const found = await this.prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        include: withLines,
      });
      if (!found) throw apiError('NOT_FOUND', 'ไม่พบใบสั่งซื้อ', 'input');
      return toPurchaseOrder(found);
    });
  }

  @Roles('PURCHASING_OFFICER')
  @Implement(contract.purchaseOrders.create)
  create(@CurrentUser() user: User) {
    return implement(contract.purchaseOrders.create).handler(async ({ input }) => {
      const fields = await this.resolveDraft(input);
      const { lines, ...header } = fields;
      const created = await this.prisma.purchaseOrder.create({
        data: { status: 'DRAFT', ...header, createdById: user.id, lines: { create: lines } },
        include: withLines,
      });
      return toPurchaseOrder(created);
    });
  }

  @Roles('PURCHASING_OFFICER')
  @Implement(contract.purchaseOrders.update)
  update() {
    return implement(contract.purchaseOrders.update).handler(async ({ input }) => {
      const existing = await this.prisma.purchaseOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw apiError('NOT_FOUND', 'ไม่พบใบสั่งซื้อ', 'input');
      if (existing.status !== 'DRAFT') throw notDraft();

      const { lines, ...header } = await this.resolveDraft(input);
      try {
        // The status in `where` makes the write itself refuse an order that left Draft meanwhile.
        const updated = await this.prisma.purchaseOrder.update({
          where: { id: input.id, status: 'DRAFT' },
          data: { ...header, lines: { deleteMany: {}, create: lines } },
          include: withLines,
        });
        return toPurchaseOrder(updated);
      } catch (error) {
        if (isRecordNotFoundError(error)) throw notDraft();
        throw error;
      }
    });
  }
}
