# Architecture Guide (MVC + Service/Repository)

This project uses a Next.js App Router adaptation of MVC:

- **View**: React components in `src/app/**`
- **Controller**: server actions and route handlers (`src/actions/**`, `src/app/**/api/**/route.ts`)
- **Service**: business rules/use cases in `src/modules/**/**.service.ts`
- **Repository**: Prisma-only data access in `src/modules/**/**.repository.ts`

## Design rules

1. Controllers do orchestration only (validate request shape, call service, map HTTP/JSON).
2. Services hold domain logic (workflow, invariants, side effects, cross-entity operations).
3. Repositories are the only place allowed to call Prisma directly.
4. Keep cache invalidation and event publishing in controllers unless domain-wide consistency requires service ownership.
5. Use shared schemas (`zod`) at boundaries and service entry points.

## N+1 prevention rules

1. List/detail reads must use `include`/`select` for related entities in one query when data is needed together.
2. Avoid per-item read loops in services/controllers (`for ... findUnique` patterns).
3. Prefer relation filters (`where: { relation: { ... } }`) over “query parent then query children in loops”.
4. For merge/sync workflows, batch writes with transactions and `createMany`/`updateMany` where practical.
5. Keep reusable list query shapes centralized in repository constants to avoid regression.

## Current domains migrated

- `src/modules/product/*`
- `src/modules/category/*`
- `src/modules/cart/*`
- `src/modules/auth/*`

Use these as templates for new features.
