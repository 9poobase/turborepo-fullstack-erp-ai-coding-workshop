import type { StockBalance } from '@erp/contracts';

/** A Prisma StockBalance row with its product (and the product's thresholds) joined in. */
export type StockBalanceRow = {
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

/** The relations every stock listing joins in so rows can be serialized by `toStockBalance`. */
export const STOCK_BALANCE_INCLUDE = { product: { include: { thresholds: true } } } as const;

/**
 * Serialize a balance row into the contract shape. The reorder threshold is the product's threshold
 * for the balance's own store (null when none is configured); a row is low-stock only when a
 * threshold exists and the quantity is at or below it.
 */
export function toStockBalance(row: StockBalanceRow): StockBalance {
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

/**
 * Prisma `where` for the optional store filter (case-insensitive) and free-text term (SKU or product
 * name). Returns `{}` when neither is given, so zero-stock rows are never filtered out.
 */
export function stockBalanceWhere(q: string | undefined, storeCode: string | undefined) {
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
  return where;
}
