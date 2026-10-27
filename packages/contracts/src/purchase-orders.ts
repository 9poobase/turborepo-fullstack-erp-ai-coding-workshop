import { oc } from '@orpc/contract';
import * as z from 'zod';
import { ApiErrorDataSchema, PaginationQuerySchema, paginated } from './common.js';

/** Every status a purchase order can hold (PO-02). Moving between them is the status machine's job. */
export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

/** A line a purchasing officer enters: which product, how many, and the purchase price. */
export const PurchaseOrderLineInputSchema = z.object({
  sku: z.string().min(1, 'กรุณาระบุรหัสสินค้า (SKU)'),
  /** Ordered quantity: a positive whole number. */
  quantity: z
    .number('จำนวนที่สั่งต้องเป็นตัวเลข')
    .int('จำนวนที่สั่งต้องเป็นจำนวนเต็ม')
    .positive('จำนวนที่สั่งต้องมากกว่า 0'),
  /** Purchase price per unit in Thai baht. Non-negative. */
  unitPrice: z.number('ราคาซื้อต่อหน่วยต้องเป็นตัวเลข').min(0, 'ราคาซื้อต่อหน่วยต้องไม่ติดลบ'),
});
export type PurchaseOrderLineInput = z.infer<typeof PurchaseOrderLineInputSchema>;

/** A line as stored: the SKU, name and unit are snapshots taken when the draft was saved. */
export const PurchaseOrderLineSchema = z.object({
  sku: z.string().min(1),
  productName: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  status: PurchaseOrderStatusSchema,
  supplierCode: z.string().min(1),
  supplierName: z.string().min(1),
  storeCode: z.string().min(1),
  storeName: z.string().min(1),
  /** Calendar date (YYYY-MM-DD) the goods are expected. */
  expectedReceiptDate: z.iso.date(),
  lines: z.array(PurchaseOrderLineSchema).min(1),
  /** The purchasing officer who created the order. */
  createdById: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

/** Fields shared by creating and editing a draft. The same SKU may not appear on two lines. */
const PurchaseOrderFieldsSchema = z.object({
  supplierCode: z.string().min(1, 'กรุณาเลือกผู้จัดจำหน่าย'),
  storeCode: z.string().min(1, 'กรุณาเลือกสาขาปลายทาง'),
  expectedReceiptDate: z.iso.date('กรุณาระบุวันที่คาดว่าจะได้รับสินค้า'),
  lines: z
    .array(PurchaseOrderLineInputSchema)
    .min(1, 'ใบสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ')
    .superRefine((lines, ctx) => {
      const seen = new Set<string>();
      lines.forEach((line, index) => {
        if (seen.has(line.sku)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'sku'],
            message: `รหัสสินค้า (SKU) "${line.sku}" ซ้ำในใบสั่งซื้อเดียวกัน`,
          });
        }
        seen.add(line.sku);
      });
    }),
});

/** Fields a purchasing officer provides when drafting an order. The id, status and timestamps are server-assigned. */
export const CreatePurchaseOrderSchema = PurchaseOrderFieldsSchema;
export type CreatePurchaseOrder = z.infer<typeof CreatePurchaseOrderSchema>;

/** Editing a draft targets it by id and replaces its supplier, store, date and lines. */
export const UpdatePurchaseOrderSchema = PurchaseOrderFieldsSchema.extend({
  id: z.string().min(1),
});
export type UpdatePurchaseOrder = z.infer<typeof UpdatePurchaseOrderSchema>;

const notFound = { NOT_FOUND: { data: ApiErrorDataSchema } };
const badRequest = { BAD_REQUEST: { data: ApiErrorDataSchema } };
/** Editing an order that has left Draft conflicts with its current status. */
const conflict = { CONFLICT: { data: ApiErrorDataSchema } };

export const purchaseOrdersContract = {
  list: oc
    .route({
      method: 'GET',
      path: '/purchase-orders',
      summary: 'List purchase orders (newest first)',
      tags: ['Purchase orders'],
    })
    .input(PaginationQuerySchema)
    .output(paginated(PurchaseOrderSchema)),
  get: oc
    .route({
      method: 'GET',
      path: '/purchase-orders/{id}',
      summary: 'Get a purchase order',
      tags: ['Purchase orders'],
    })
    .errors(notFound)
    .input(z.object({ id: z.string().min(1) }))
    .output(PurchaseOrderSchema),
  create: oc
    .route({
      method: 'POST',
      path: '/purchase-orders',
      summary: 'Create a draft purchase order',
      tags: ['Purchase orders'],
    })
    .errors({ ...notFound, ...badRequest })
    .input(CreatePurchaseOrderSchema)
    .output(PurchaseOrderSchema),
  update: oc
    .route({
      method: 'PUT',
      path: '/purchase-orders/{id}',
      summary: 'Edit a draft purchase order',
      tags: ['Purchase orders'],
    })
    .errors({ ...notFound, ...badRequest, ...conflict })
    .input(UpdatePurchaseOrderSchema)
    .output(PurchaseOrderSchema),
};
