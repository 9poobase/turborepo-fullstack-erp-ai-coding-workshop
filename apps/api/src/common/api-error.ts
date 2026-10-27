import type { ApiErrorCode, ApiErrorData } from '@erp/contracts';
import { ORPCError } from '@orpc/server';

/**
 * Build an oRPC error carrying the standard Thai payload. On the wire the shape is
 * `{ code, messageTh, kind }`: the error's own `code`, plus `data: { messageTh, kind }`.
 * The English `message` is for logs only and is never surfaced to the user.
 */
export function apiError(
  code: ApiErrorCode,
  messageTh: string,
  kind: ApiErrorData['kind'],
  message?: string,
) {
  return new ORPCError(code, { message: message ?? messageTh, data: { messageTh, kind } });
}

/** True when a Prisma write matched no row (code `P2025`), e.g. its `where` filter no longer holds. */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2025'
  );
}

/**
 * True when a Prisma error is a unique-constraint violation (duplicate key). Prisma known-request
 * errors carry a stable string `code`; `P2002` is the unique-constraint code. Matched structurally
 * so this does not depend on importing the generated error class.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
