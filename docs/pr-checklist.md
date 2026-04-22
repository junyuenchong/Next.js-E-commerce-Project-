# PR Checklist

Use this before opening or merging a PR.

- Names are explicit (no ambiguous aliases like `data`, `res`, `j`, `s`).
- `Payload / Result / Response` suffixes are used consistently.
- Layer boundaries are respected:
  - `route`: HTTP input/output mapping only.
  - `action`: thin orchestration adapters.
  - `service`: business rules.
  - `repo`: database persistence only.
- New/changed APIs return stable response shape and error codes.
- Idempotency and retry behavior are preserved for payment/order flows.
- Added or updated code paths include basic error handling and logs.
- Lint passes for changed files.
- No secrets or environment-specific sensitive values are committed.
