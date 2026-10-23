# AGENTS.md (apps/api)

Rules for `@erp/api`. The repo-wide rules in the [root AGENTS.md](../../AGENTS.md) still apply.

## Stack

NestJS 12 (native ESM), oRPC via `@orpc/nest`, Prisma through `@erp/database`, Vitest.

## Rules

- **One Nest module per feature** in `src/<feature>/` (`<feature>.module.ts`, `<feature>.controller.ts`). Register it in `src/app.module.ts`.
- **Implement contract routes, don't declare your own.** Every handler is `@Implement(contract.<feature>.<route>)` returning `implement(contract.<feature>.<route>).handler(...)`. Path, method, input and output come from `@erp/contracts`. See `src/health/health.controller.ts`.
- **No `class-validator` DTOs.** Input is already validated by the contract's Zod schemas. Types come from the contract too.
- **Database access** goes through `PrismaService` (`src/database`), injected via DI. Don't create `PrismaClient` instances.
- **Relative imports need `.js`**: `import { HealthModule } from './health/health.module.js'`.
- **Env vars** are read through `@nestjs/config` and validated in `src/config/env.ts`.
- The global prefix is `/api`. Don't repeat it in contract paths.

## Tests

- Colocate `*.spec.ts` next to the code.
- Build the controller with `Test.createTestingModule` and replace `PrismaService` with a stub (`useValue`).
- Run a handler with `call(controller.<route>(), input)` from `@orpc/server`. See `src/health/health.controller.spec.ts`.
- Run only the api tests: `pnpm turbo run test --filter=@erp/api`.
