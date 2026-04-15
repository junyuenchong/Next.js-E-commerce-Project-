# Shared Contract Structure

`src/shared` stores cross-layer contracts only.

## Source of Truth

- `src/shared/schema/<module>` for validation contracts.
- `src/shared/types/<module>` for TS contracts.
- Prefer module entrypoints (`index.ts`) over deep imports.

## Suggested Imports

- Admin schemas: `@/shared/schema/admin`
- User schemas: `@/shared/schema/user`
- Admin types: `@/shared/types/admin`
- User types: `@/shared/types/user`
