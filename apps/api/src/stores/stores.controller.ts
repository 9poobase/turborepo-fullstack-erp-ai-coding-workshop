import { Controller } from '@nestjs/common';
import { contract, type Store } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { Roles } from '../auth/auth.decorators.js';
import { apiError, isUniqueConstraintError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';

type StoreRow = { id: string; code: string; name: string; createdAt: Date; updatedAt: Date };

/** Serialize a Prisma row into the contract shape (timestamps as ISO strings). */
function toStore(row: StoreRow): Store {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

const duplicateCode = (code: string) =>
  apiError('CONFLICT', `รหัสสาขา "${code}" นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น`, 'input');

@Controller()
export class StoresController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.stores.list)
  list() {
    return implement(contract.stores.list).handler(async ({ input }) => {
      const { page, pageSize } = input;
      const [rows, total] = await Promise.all([
        this.prisma.store.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.store.count(),
      ]);
      return { items: rows.map(toStore), total, page, pageSize };
    });
  }

  @Roles('ADMIN')
  @Implement(contract.stores.create)
  create() {
    return implement(contract.stores.create).handler(async ({ input }) => {
      try {
        return toStore(await this.prisma.store.create({ data: input }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateCode(input.code);
        throw error;
      }
    });
  }

  @Roles('ADMIN')
  @Implement(contract.stores.update)
  update() {
    return implement(contract.stores.update).handler(async ({ input }) => {
      const { id, ...data } = input;
      try {
        return toStore(await this.prisma.store.update({ where: { id }, data }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateCode(input.code);
        throw error;
      }
    });
  }
}
