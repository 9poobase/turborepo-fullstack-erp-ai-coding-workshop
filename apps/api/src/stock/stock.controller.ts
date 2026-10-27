import { Controller } from '@nestjs/common';
import { contract } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { PrismaService } from '../database/prisma.service.js';
import { findStockBalancePage } from './stock-balance.js';

@Controller()
export class StockController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.stock.search)
  search() {
    return implement(contract.stock.search).handler(({ input }) =>
      findStockBalancePage(this.prisma, input),
    );
  }
}
