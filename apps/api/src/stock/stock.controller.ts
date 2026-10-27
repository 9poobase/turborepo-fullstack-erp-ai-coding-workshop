import { Controller } from '@nestjs/common';
import { contract, type StockBalance } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { PrismaService } from '../database/prisma.service.js';

/** A Prisma StockBalance row with its product (and the product's thresholds) joined in. */
type StockBalanceRow = {
  productId: string;
  storeCode: string;
  quantity: number;
  product: {
    sku: string;
    name: string;
    unit: string;
    thresholds: { storeCode: string; threshold: number }[];
  };
};

/**
 * Serialize a balance row into the contract shape. The reorder threshold is the product's threshold
 * for the balance's own store (null when none is configured); a row is low-stock only when a
 * threshold exists and the quantity is at or below it.
 */
function toStockBalance(row: StockBalanceRow): StockBalance {
  const match = row.product.thresholds.find((t) => t.storeCode === row.storeCode);
  const threshold = match ? match.threshold : null;
  return {
    productId: row.productId,
    sku: row.product.sku,
    productName: row.product.name,
    storeCode: row.storeCode,
    quantity: row.quantity,
    unit: row.product.unit,
    threshold,
    lowStock: threshold !== null && row.quantity <= threshold,
  };
}

@Controller()
export class StockController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.stock.search)
  search() {
    return implement(contract.stock.search).handler(async ({ input }) => {
      const { page, pageSize, q, storeCode } = input;

      const where: Record<string, unknown> = {};
      if (storeCode) where.storeCode = { equals: storeCode, mode: 'insensitive' };
      const term = q?.trim();
      if (term) {
        where.product = {
          OR: [
            { sku: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        };
      }

      const [rows, total] = await Promise.all([
        this.prisma.stockBalance.findMany({
          where,
          // Newest-first, with id as a stable tiebreaker so pagination can't repeat or skip rows.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { product: { include: { thresholds: true } } },
        }),
        this.prisma.stockBalance.count({ where }),
      ]);

      return { items: rows.map(toStockBalance), total, page, pageSize };
    });
  }
}
