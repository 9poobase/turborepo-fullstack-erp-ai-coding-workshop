import { Test } from '@nestjs/testing';
import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { StoresController } from './stores.controller.js';

async function createController(store: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [StoresController],
    providers: [{ provide: PrismaService, useValue: { store } }],
  }).compile();
  return moduleRef.get(StoresController);
}

/** Shape of a Prisma unique-constraint violation (code P2002), as the client throws it. */
function duplicateCodeError() {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target: ['code'] },
  });
}

const row = {
  id: 's1',
  code: 'B01',
  name: 'Central Store',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('StoresController', () => {
  it('creates a store', async () => {
    const create = vi.fn().mockResolvedValue(row);
    const controller = await createController({ create });

    await expect(
      call(controller.create(), { code: 'B01', name: 'Central Store' }),
    ).resolves.toMatchObject({ id: 's1', code: 'B01', name: 'Central Store' });
    expect(create).toHaveBeenCalledWith({ data: { code: 'B01', name: 'Central Store' } });
  });

  it('edits a store by id', async () => {
    const update = vi.fn().mockResolvedValue({ ...row, name: 'Renamed' });
    const controller = await createController({ update });

    await expect(
      call(controller.update(), { id: 's1', code: 'B01', name: 'Renamed' }),
    ).resolves.toMatchObject({ name: 'Renamed' });
    expect(update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { code: 'B01', name: 'Renamed' },
    });
  });

  it('rejects a duplicate code with a Thai conflict error', async () => {
    const create = vi.fn().mockRejectedValue(duplicateCodeError());
    const controller = await createController({ create });

    await expect(
      call(controller.create(), { code: 'B01', name: 'Central Store' }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      data: { kind: 'input', messageTh: expect.stringContaining('B01') },
    });
  });

  it('lists stores newest-first with the paginated envelope', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    const count = vi.fn().mockResolvedValue(1);
    const controller = await createController({ findMany, count });

    await expect(call(controller.list(), { page: 1, pageSize: 20 })).resolves.toEqual({
      items: [{ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('applies skip and take for a later page', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(40);
    const controller = await createController({ findMany, count });

    await call(controller.list(), { page: 3, pageSize: 10 });

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' }, skip: 20, take: 10 });
  });
});
