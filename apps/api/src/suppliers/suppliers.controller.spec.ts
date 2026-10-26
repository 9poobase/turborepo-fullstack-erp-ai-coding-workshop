import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { SuppliersController } from './suppliers.controller.js';

async function createController(supplier: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [SuppliersController],
    providers: [{ provide: PrismaService, useValue: { supplier } }],
  }).compile();
  return moduleRef.get(SuppliersController);
}

/** Shape of a Prisma unique-constraint violation (code P2002), as the client throws it. */
function duplicateCodeError() {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target: ['code'] },
  });
}

const row = {
  id: 'sup1',
  code: 'SUP01',
  name: 'SupplyOne Co Ltd',
  contact: 'Khun A, 02-000-0000',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const input = { code: 'SUP01', name: 'SupplyOne Co Ltd', contact: 'Khun A, 02-000-0000' };

describe('SuppliersController', () => {
  it('creates a supplier', async () => {
    const create = vi.fn().mockResolvedValue(row);
    const controller = await createController({ create });

    await expect(call(controller.create(), input)).resolves.toMatchObject({
      id: 'sup1',
      code: 'SUP01',
      contact: 'Khun A, 02-000-0000',
    });
    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it('edits a supplier by id', async () => {
    const update = vi.fn().mockResolvedValue({ ...row, name: 'Renamed' });
    const controller = await createController({ update });

    await expect(call(controller.update(), { id: 'sup1', ...input, name: 'Renamed' })).resolves.toMatchObject(
      { name: 'Renamed' },
    );
    expect(update).toHaveBeenCalledWith({ where: { id: 'sup1' }, data: { ...input, name: 'Renamed' } });
  });

  it('rejects a duplicate code with a Thai conflict error', async () => {
    const create = vi.fn().mockRejectedValue(duplicateCodeError());
    const controller = await createController({ create });

    await expect(call(controller.create(), input)).rejects.toMatchObject({
      code: 'CONFLICT',
      data: { kind: 'input', messageTh: expect.stringContaining('SUP01') },
    });
  });

  it('lists suppliers newest-first with the paginated envelope', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    await expect(call(controller.list(), { page: 1, pageSize: 20 })).resolves.toEqual({
      items: [
        { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' }, skip: 0, take: 20 });
  });
});
