import { oc } from '@orpc/contract';
import * as z from 'zod';
import { PaginationQuerySchema, paginated } from './common.js';

/**
 * One row of a stock search: the current balance for a product at a store, with the store's reorder
 * threshold and a low-stock flag. `threshold` is null when the store has no configured reorder point
 * for the product; `lowStock` is true only when a threshold exists and the quantity is at or below it.
 */
export const StockBalanceSchema = z.object({
  productId: z.string(),
  sku: z.string().min(1),
  productName: z.string().min(1),
  category: z.string().min(1),
  storeCode: z.string().min(1),
  /** Current on-hand quantity. Non-negative whole number. */
  quantity: z.number().int().min(0),
  unit: z.string().min(1),
  /** Reorder threshold for this product at this store, or null when none is configured. */
  threshold: z.number().int().min(0).nullable(),
  /** True when a threshold is configured and quantity is at or below it. */
  lowStock: z.boolean(),
});
export type StockBalance = z.infer<typeof StockBalanceSchema>;

/**
 * Query params for a stock search. Extends the shared pagination query with an optional free-text
 * term (matched against SKU and product name) and an optional store filter.
 */
export const StockSearchQuerySchema = PaginationQuerySchema.extend({
  /** Free-text term matched against SKU and product name. */
  q: z.string().optional(),
  /** Restrict results to a single store code, e.g. "B01". */
  storeCode: z.string().optional(),
});
export type StockSearchQuery = z.infer<typeof StockSearchQuerySchema>;

export const stockContract = {
  search: oc
    .route({
      method: 'GET',
      path: '/stock/search',
      summary: 'Search stock balances by SKU, product name and store (newest first)',
      tags: ['Stock'],
    })
    .input(StockSearchQuerySchema)
    .output(paginated(StockBalanceSchema)),
};
