# Naming Conventions

Keep names explicit so `route -> action -> service -> repo` flow is easy to read.

## Core Rules

- Prefer domain words over short aliases (`paymentRecord`, not `p`).
- Keep one meaning per suffix:
  - `...Payload`: parsed JSON/body object.
  - `...Result`: return from a function with `ok/status/kind`.
  - `...Response`: HTTP response object.
  - `...HttpResponse`: raw `fetch()` response object.
- Use `...Id` only for scalar IDs (`orderId`, `paymentId`).
- Use `...List` or plural for arrays (`orderListPayload`, `visibleOrders`).

## Layer Naming

- `route`: HTTP parsing, validation, response mapping only.
- `action`: thin adapters/orchestration for route or server action usage.
- `service`: business rules and cross-repo coordination.
- `repo`: Prisma/DB persistence only.
- `hook`: UI state, effects, and network call orchestration.

## Common Patterns

- Parse helpers:
  - `parseXxx...`
  - `resolveXxx...`
  - `readXxx...`
- Guard-style functions:
  - `xxxOrError` returns `{ ok: false, response } | { ok: true, ... }`.
- Reconciliation/polling helpers:
  - `waitFor...Result`
  - `apply...Event`

## Avoid

- Single-letter or ambiguous variable names (`j`, `s`, `data`, `res`).
- Mixing `payload/result/response` terms for the same value.
- Cross-layer logic leakage (e.g. DB mutation inside route unless intentionally tiny).
