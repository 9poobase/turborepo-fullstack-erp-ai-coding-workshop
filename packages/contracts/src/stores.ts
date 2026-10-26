import { oc } from '@orpc/contract';
import * as z from 'zod';
import { ApiErrorDataSchema, PaginationQuerySchema, paginated } from './common.js';

export const StoreSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Store = z.infer<typeof StoreSchema>;

/** Fields an administrator provides when creating a store. The id and timestamps are server-assigned. */
export const CreateStoreSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});
export type CreateStore = z.infer<typeof CreateStoreSchema>;

/** Editing a store targets it by id and replaces its editable fields. */
export const UpdateStoreSchema = CreateStoreSchema.extend({ id: z.string().min(1) });
export type UpdateStore = z.infer<typeof UpdateStoreSchema>;

/** A duplicate code conflict carries the standard Thai error payload. */
const conflict = { CONFLICT: { data: ApiErrorDataSchema } };

export const storesContract = {
  list: oc
    .route({
      method: 'GET',
      path: '/stores',
      summary: 'List stores (newest first)',
      tags: ['Stores'],
    })
    .input(PaginationQuerySchema)
    .output(paginated(StoreSchema)),
  create: oc
    .route({ method: 'POST', path: '/stores', summary: 'Create a store', tags: ['Stores'] })
    .errors(conflict)
    .input(CreateStoreSchema)
    .output(StoreSchema),
  update: oc
    .route({ method: 'PUT', path: '/stores/{id}', summary: 'Edit a store', tags: ['Stores'] })
    .errors(conflict)
    .input(UpdateStoreSchema)
    .output(StoreSchema),
};
