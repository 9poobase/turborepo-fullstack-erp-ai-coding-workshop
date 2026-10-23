# AGENTS.md (apps/web)

Rules for `@erp/web`. The repo-wide rules in the [root AGENTS.md](../../AGENTS.md) still apply.

## Stack

Vite + React 19, React Router, TanStack Query, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library.

## Rules

- **Imports use the `@/` alias** for `src/`, with no file extension: `import { orpc } from '@/lib/orpc'`.
- **Talk to the API only through the typed client** in `src/lib/orpc.ts`. No hand-written `fetch` calls or response types.
  - Read: `useQuery(orpc.<feature>.<route>.queryOptions({ input }))`
  - Write: `useMutation(orpc.<feature>.<route>.mutationOptions())`
  - See `src/components/health-status.tsx`.
- **Requests go to `/api` on the same origin.** Vite proxies them to the NestJS app. Don't hard-code the API URL.
- **Routes** are registered in `src/router.tsx`. Page components live in `src/routes/`.
- **UI components**: shadcn/ui lives in `src/components/ui`. Add more with `pnpm dlx shadcn@latest add <component>` from `apps/web`. Don't hand-edit them unless necessary. Feature components go in `src/components/`.
- **Styling** with Tailwind utility classes. Use `cn()` from `@/lib/utils` to merge class names.

## Tests

- Colocate `*.test.tsx` next to the component.
- Wrap the component in a `QueryClientProvider` using `createQueryClient()` from `@/lib/query-client`.
- Mock the API with `vi.stubGlobal('fetch', ...)` and clean up with `vi.unstubAllGlobals()`. See `src/components/health-status.test.tsx`.
- Run only the web tests: `pnpm turbo run test --filter=@erp/web`.
