import * as z from 'zod';

/**
 * Shared list conventions for the whole API.
 *
 * Lists paginate and order newest-first. Clients send a `PaginationQuery`; the API answers with a
 * `paginated(...)` envelope. API errors carry a Thai message and a recovery hint via `ApiErrorData`.
 */

/** Default number of rows per page for every list. Shared by the API and the web call sites. */
export const DEFAULT_PAGE_SIZE = 20;

/** Query params every paginated list accepts. Newest-first ordering is applied by the API. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Wrap an item schema in the standard paginated response envelope. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}

/**
 * Standard error payload carried in an oRPC error's `data`. With the error's own `code`, the wire
 * shape is `{ code, messageTh, kind }`:
 * - `messageTh` — a user-facing Thai message (never a stack trace or database detail).
 * - `kind` — whether the user should fix their input (`'input'`) or retry later (`'retry'`).
 */
export const ApiErrorDataSchema = z.object({
  messageTh: z.string().min(1),
  kind: z.enum(['input', 'retry']),
});
export type ApiErrorData = z.infer<typeof ApiErrorDataSchema>;

/** oRPC error codes the API uses with the standard Thai error payload. */
export type ApiErrorCode = 'BAD_REQUEST' | 'CONFLICT' | 'NOT_FOUND';
