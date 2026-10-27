import { oc } from '@orpc/contract';
import * as z from 'zod';
import { ApiErrorDataSchema, PaginationQuerySchema, paginated } from './common.js';

/** A reorder threshold for a product at one store. Quantities are whole numbers. */
export const ProductStoreThresholdSchema = z.object({
  storeCode: z.string().min(1),
  threshold: z.number().int().min(0),
});
export type ProductStoreThreshold = z.infer<typeof ProductStoreThresholdSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  /** Selling price in Thai baht. Non-negative. */
  sellingPrice: z.number().min(0),
  active: z.boolean(),
  thresholds: z.array(ProductStoreThresholdSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Product = z.infer<typeof ProductSchema>;

/** Fields an administrator provides when creating a product. The id and timestamps are server-assigned. */
export const CreateProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  sellingPrice: z.number().min(0),
  active: z.boolean(),
  thresholds: z.array(ProductStoreThresholdSchema),
});
export type CreateProduct = z.infer<typeof CreateProductSchema>;

/** Editing a product targets it by id and replaces its editable fields. */
export const UpdateProductSchema = CreateProductSchema.extend({ id: z.string().min(1) });
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

/** A duplicate SKU conflict carries the standard Thai error payload. */
const conflict = { CONFLICT: { data: ApiErrorDataSchema } };

/** An inactive product cannot be added to a new document; the guard returns the Thai payload. */
const badRequest = { BAD_REQUEST: { data: ApiErrorDataSchema } };

export const productsContract = {
  list: oc
    .route({
      method: 'GET',
      path: '/products',
      summary: 'List products (newest first)',
      tags: ['Products'],
    })
    .input(PaginationQuerySchema)
    .output(paginated(ProductSchema)),
  create: oc
    .route({ method: 'POST', path: '/products', summary: 'Create a product', tags: ['Products'] })
    .errors(conflict)
    .input(CreateProductSchema)
    .output(ProductSchema),
  update: oc
    .route({ method: 'PUT', path: '/products/{id}', summary: 'Edit a product', tags: ['Products'] })
    .errors(conflict)
    .input(UpdateProductSchema)
    .output(ProductSchema),
  /**
   * Resolve a product by SKU for adding to a new document (purchase order, sale, receipt).
   * Active products are returned; an inactive product is rejected so it cannot enter a new
   * document, while remaining searchable via `list`.
   */
  forDocument: oc
    .route({
      method: 'GET',
      path: '/products/for-document/{sku}',
      summary: 'Resolve an active product by SKU for a new document',
      tags: ['Products'],
    })
    .errors({ ...conflict, ...badRequest, NOT_FOUND: { data: ApiErrorDataSchema } })
    .input(z.object({ sku: z.string().min(1) }))
    .output(ProductSchema),
};
