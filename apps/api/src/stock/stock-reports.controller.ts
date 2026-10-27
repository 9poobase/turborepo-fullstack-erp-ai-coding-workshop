import { Controller } from '@nestjs/common';
import { contract } from '@erp/contracts';
import { Prisma } from '@erp/database';
import { Implement, implement } from '@orpc/nest';
import { Roles } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  findStockBalancePage,
  STOCK_BALANCE_INCLUDE,
  type StockBalanceRow,
  toStockBalance,
} from './stock-balance.js';

/**
 * The balances at or below their own store's reorder threshold, filtered by the optional store
 * (case-insensitive) and term (SKU or product name, case-insensitive substring). Prisma cannot
 * compare two columns across relations in a filter, so this selects ids in SQL. Every user value is
 * bound as a parameter.
 */
function lowStockFilter(q: string | undefined, storeCode: string | undefined) {
  const conditions = [Prisma.sql`b.quantity <= t.threshold`];
  if (storeCode) conditions.push(Prisma.sql`lower(b."storeCode") = lower(${storeCode})`);
  const term = q?.trim();
  if (term) {
    conditions.push(
      Prisma.sql`(strpos(lower(p.sku), lower(${term})) > 0 OR strpos(lower(p.name), lower(${term})) > 0)`,
    );
  }
  return Prisma.sql`
    FROM "StockBalance" b
    JOIN "Product" p ON p.id = b."productId"
    JOIN "ProductStoreThreshold" t ON t."productId" = b."productId" AND t."storeCode" = b."storeCode"
    WHERE ${Prisma.join(conditions, ' AND ')}`;
}

/** Stock reports for managers (and administrators, who act across all stores). */
@Roles('MANAGER', 'ADMIN')
@Controller()
export class StockReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.stock.onHand)
  onHand() {
    return implement(contract.stock.onHand).handler(({ input }) =>
      findStockBalancePage(this.prisma, input),
    );
  }

  @Implement(contract.stock.lowStock)
  lowStock() {
    return implement(contract.stock.lowStock).handler(async ({ input }) => {
      const { page, pageSize, q, storeCode } = input;
      const filter = lowStockFilter(q, storeCode);

      const [ids, counts] = await Promise.all([
        this.prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT b.id ${filter}
            ORDER BY b."createdAt" DESC, b.id DESC
            LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        ),
        this.prisma.$queryRaw<{ count: number }[]>(
          Prisma.sql`SELECT COUNT(*)::int AS count ${filter}`,
        ),
      ]);
      const total = counts[0]?.count ?? 0;
      if (ids.length === 0) return { items: [], total, page, pageSize };

      const loaded = await this.prisma.stockBalance.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        include: STOCK_BALANCE_INCLUDE,
      });
      // `IN` does not preserve order: restore the newest-first order the id query chose.
      const byId = new Map<string, StockBalanceRow>(loaded.map((balance) => [balance.id, balance]));
      const items = ids.flatMap(({ id }) => {
        const balance = byId.get(id);
        return balance ? [toStockBalance(balance)] : [];
      });

      return { items, total, page, pageSize };
    });
  }
}
