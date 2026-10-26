import { Controller } from '@nestjs/common';
import { contract, type Supplier } from '@erp/contracts';
import { Implement, implement } from '@orpc/nest';
import { Roles } from '../auth/auth.decorators.js';
import { apiError, isUniqueConstraintError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';

type SupplierRow = {
  id: string;
  code: string;
  name: string;
  contact: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Serialize a Prisma row into the contract shape (timestamps as ISO strings). */
function toSupplier(row: SupplierRow): Supplier {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

const duplicateCode = (code: string) =>
  apiError('CONFLICT', `รหัสผู้จัดจำหน่าย "${code}" นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น`, 'input');

@Controller()
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Implement(contract.suppliers.list)
  list() {
    return implement(contract.suppliers.list).handler(async ({ input }) => {
      const { page, pageSize } = input;
      const [rows, total] = await Promise.all([
        this.prisma.supplier.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.supplier.count(),
      ]);
      return { items: rows.map(toSupplier), total, page, pageSize };
    });
  }

  @Roles('ADMIN')
  @Implement(contract.suppliers.create)
  create() {
    return implement(contract.suppliers.create).handler(async ({ input }) => {
      try {
        return toSupplier(await this.prisma.supplier.create({ data: input }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateCode(input.code);
        throw error;
      }
    });
  }

  @Roles('ADMIN')
  @Implement(contract.suppliers.update)
  update() {
    return implement(contract.suppliers.update).handler(async ({ input }) => {
      const { id, ...data } = input;
      try {
        return toSupplier(await this.prisma.supplier.update({ where: { id }, data }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw duplicateCode(input.code);
        throw error;
      }
    });
  }
}
