import { Controller } from '@nestjs/common';
import { contract, type Product } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { Roles } from '../auth/auth.decorators.js';
import { apiError, isUniqueConstraintError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';

/** A Prisma Decimal exposes toNumber(); fall back to Number() for plain values. */
type DecimalLike = { toNumber: () => number };

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  sellingPrice: DecimalLike | number;
  active: boolean;
  thresholds: { storeCode: string; threshold: number }[];
  createdAt: Date;
  updatedAt: Date;
};

function toNumber(value: DecimalLike | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

/** Serialize a Prisma row into the contract shape (price as number, timestamps as ISO strings). */
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unit: row.unit,
    sellingPrice: toNumber(row.sellingPrice),
    active: row.active,
    thresholds: row.thresholds.map((t) => ({ storeCode: t.storeCode, threshold: t.threshold })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const duplicateSku = (sku: string) =>
  apiError('CONFLICT', `รหัสสินค้า (SKU) "${sku}" นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น`, 'input');

@Controller()
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.products.list)
  list() {
    return implement(contract.products.list).handler(async ({ input }) => {
      const { page, pageSize } = input;
      const [rows, total] = await Promise.all([
        this.prisma.product.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { thresholds: true },
        }),
        this.prisma.product.count(),
      ]);
      return { items: rows.map(toProduct), total, page, pageSize };
    });
  }

  @Roles('ADMIN')
  @Implement(contract.products.create)
  create() {
    return implement(contract.products.create).handler(async ({ input }) => {
      const { thresholds, ...fields } = input;
      try {
        const created = await this.prisma.product.create({
          data: { ...fields, thresholds: { create: thresholds } },
          include: { thresholds: true },
        });
        return toProduct(created);
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateSku(input.sku);
        throw error;
      }
    });
  }

  @Roles('ADMIN')
  @Implement(contract.products.update)
  update() {
    return implement(contract.products.update).handler(async ({ input }) => {
      const { id, thresholds, ...fields } = input;
      try {
        const updated = await this.prisma.product.update({
          where: { id },
          data: { ...fields, thresholds: { deleteMany: {}, create: thresholds } },
          include: { thresholds: true },
        });
        return toProduct(updated);
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateSku(input.sku);
        throw error;
      }
    });
  }

  @Implement(contract.products.forDocument)
  forDocument() {
    return implement(contract.products.forDocument).handler(async ({ input }) => {
      const found = await this.prisma.product.findUnique({
        where: { sku: input.sku },
        include: { thresholds: true },
      });
      if (!found) {
        throw apiError('NOT_FOUND', `ไม่พบสินค้ารหัส (SKU) "${input.sku}"`, 'input');
      }
      if (!found.active) {
        throw apiError(
          'BAD_REQUEST',
          `สินค้ารหัส (SKU) "${input.sku}" ถูกปิดการใช้งาน ไม่สามารถเพิ่มลงในเอกสารใหม่ได้`,
          'input',
        );
      }
      return toProduct(found);
    });
  }
}
