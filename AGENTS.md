# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Kiro, Codex, ...) working in this repository.
Humans: see [README.md](README.md).

## What this is

A teaching monorepo for a full-stack ERP built during an on-site workshop.
Turborepo + pnpm workspaces, everything runs in Docker for local development.

| Path                         | Package                  | What                                                                |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `apps/web`                   | `@erp/web`               | Vite + React 19, React Router, TanStack Query, Tailwind v4, shadcn  |
| `apps/api`                   | `@erp/api`               | NestJS 12 (native ESM), oRPC contract implementation, Prisma access |
| `packages/contracts`         | `@erp/contracts`         | API contract: oRPC routes + Zod schemas. Single source of truth     |
| `packages/database`          | `@erp/database`          | Prisma 7 schema, migrations, seed, generated client                 |
| `packages/typescript-config` | `@erp/typescript-config` | Shared `tsconfig` bases                                             |
| `packages/eslint-config`     | `@erp/eslint-config`     | Shared ESLint flat configs                                          |

## Commands

Run from the repo root. With Docker, prefix with `docker compose exec api` (e.g. `docker compose exec api pnpm db:migrate --name add_customer`).

| Command                         | What                                                           |
| ------------------------------- | -------------------------------------------------------------- |
| `docker compose up`             | Start postgres, api (http://localhost:3000/api), web (:5173)   |
| `pnpm dev`                      | Same, without Docker for the apps (needs Postgres running)     |
| `pnpm dev:local`                | Start Postgres in Docker, apply migrations, then `pnpm dev`    |
| `pnpm check`                    | lint + typecheck + test + build everything (run before commit) |
| `pnpm test` / `pnpm typecheck`  | Turbo runs it in every package                                 |
| `pnpm db:migrate --name <name>` | Create + apply a migration after editing `schema.prisma`       |
| `pnpm db:generate`              | Regenerate the Prisma client                                   |
| `pnpm db:seed`                  | Run `packages/database/prisma/seed.ts`                         |
| `pnpm db:reset`                 | Drop the DB, re-apply all migrations, seed                     |

Filter to one package: `pnpm turbo run test --filter=@erp/api`.

## Adding a feature (contract-first workflow)

1. **Data model**: add/modify models in `packages/database/prisma/schema.prisma`, then `pnpm db:migrate --name <change>`.
2. **Contract**: add Zod schemas + oRPC routes in `packages/contracts/src/<feature>.ts`, export from `src/index.ts`, and register them in the `contract` object.
3. **API**: create a Nest module in `apps/api/src/<feature>/`. Implement every route with `@Implement(contract.<feature>.<route>)` + `implement(...).handler(...)`. See `apps/api/src/health/health.controller.ts`. Register the module in `app.module.ts`.
4. **Web**: call it with `useQuery(orpc.<feature>.<route>.queryOptions({ input }))` / `useMutation(orpc.<feature>.<route>.mutationOptions())`. See `apps/web/src/components/health-status.tsx`.
5. **Tests**: colocate `*.spec.ts` (api, use `call()` from `@orpc/server`) and `*.test.ts(x)` (web/packages, Vitest).
6. Run `pnpm check`.

Never hand-write request/response types in the apps. Derive them from `@erp/contracts` (`z.infer`), so a contract change breaks the build on both sides.

## Conventions

- **ESM everywhere.** In `apps/api` and `packages/*`, relative imports need the `.js` extension (`import { x } from './x.js'`). `apps/web` uses the `@/` alias for `src/` with no extension.
- **Validation lives in the contract** (Zod). Don't add `class-validator` DTOs in Nest.
- **Database access** goes through `PrismaService` (`apps/api/src/database`), which is injected via DI. Don't create `PrismaClient` instances in the api.
- **Env vars** are validated in `apps/api/src/config/env.ts`. Add new ones there and to `.env.example`. If a turbo task needs one, add it to `globalPassThroughEnv` in `turbo.json`.
- **UI components**: shadcn/ui lives in `apps/web/src/components/ui`. Add more with `pnpm dlx shadcn@latest add <component>` from `apps/web`. Don't hand-edit unless necessary.
- **Formatting**: Prettier (single quotes, trailing commas, width 100). `pnpm format`.
- Shared packages are built with tsup into `dist/`. The apps import the built output. `turbo dev` keeps them rebuilt in watch mode.

## Gotchas

- `node_modules` is shared between the host and the containers (bind mount). After adding a dependency, run `pnpm install` in only one place.
- Prisma 7: the client is generated into `packages/database/src/generated` (gitignored) and connects through the `@prisma/adapter-pg` driver adapter. `migrate dev` does not run `generate`. `turbo` and `pnpm dev` handle generation for you.
- The API's global prefix is `/api`, and contract paths are relative to it (`/health` → `/api/health`).
