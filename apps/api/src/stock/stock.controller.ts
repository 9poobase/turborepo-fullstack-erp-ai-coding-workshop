import { Controller } from '@nestjs/common';
import { contract } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { PrismaService } from '../database/prisma.service.js';
import { STOCK_BALANCE_INCLUDE, stockBalanceWhere, toStockBalance } from './stock-balance.js';

@Controller()
export class StockController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.stock.search)
  search() {
    return implement(contract.stock.search).handler(async ({ input }) => {
      const { page, pageSize, q, storeCode } = input;
      const where = stockBalanceWhere(q, storeCode);

      const [rows, total] = await Promise.all([
        this.prisma.stockBalance.findMany({
          where,
          // Newest-first, with id as a stable tiebreaker so pagination can't repeat or skip rows.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: STOCK_BALANCE_INCLUDE,
        }),
        this.prisma.stockBalance.count({ where }),
      ]);

      return { items: rows.map(toStockBalance), total, page, pageSize };
    });
  }
}
