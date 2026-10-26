import { oc } from '@orpc/contract';
import * as z from 'zod';
import { ApiErrorDataSchema, PaginationQuerySchema, paginated } from './common.js';

export const SupplierSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  contact: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

/** Fields an administrator provides when creating a supplier. The id and timestamps are server-assigned. */
export const CreateSupplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contact: z.string().min(1),
});
export type CreateSupplier = z.infer<typeof CreateSupplierSchema>;

/** Editing a supplier targets it by id and replaces its editable fields. */
export const UpdateSupplierSchema = CreateSupplierSchema.extend({ id: z.string().min(1) });
export type UpdateSupplier = z.infer<typeof UpdateSupplierSchema>;

/** A duplicate code conflict carries the standard Thai error payload. */
const conflict = { CONFLICT: { data: ApiErrorDataSchema } };

export const suppliersContract = {
  list: oc
    .route({
      method: 'GET',
      path: '/suppliers',
      summary: 'List suppliers (newest first)',
      tags: ['Suppliers'],
    })
    .input(PaginationQuerySchema)
    .output(paginated(SupplierSchema)),
  create: oc
    .route({
      method: 'POST',
      path: '/suppliers',
      summary: 'Create a supplier',
      tags: ['Suppliers'],
    })
    .errors(conflict)
    .input(CreateSupplierSchema)
    .output(SupplierSchema),
  update: oc
    .route({
      method: 'PUT',
      path: '/suppliers/{id}',
      summary: 'Edit a supplier',
      tags: ['Suppliers'],
    })
    .errors(conflict)
    .input(UpdateSupplierSchema)
    .output(SupplierSchema),
};
