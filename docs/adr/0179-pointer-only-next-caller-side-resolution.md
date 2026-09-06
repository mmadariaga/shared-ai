# ADR 0179: Pointer-only next, caller-side resolution

## Status

Accepted

## Context

The two harnesses resolve `@`-paths against different roots, and only the caller knows its active root. The existing `Active step:` pointer mechanism already separates pointer emission from instruction-body rendering, and panel ownership plus marking hooks live caller-side. Embedding rendered content in sidecar responses would duplicate that mechanism and risk drift.

## Decision

Keep `next` pointer-only with caller-side resolution:

- `next` is the fixed minimal template `{follow, hint}` with path interpolation; the service never renders instruction bodies or panels.
- The caller resolves `@`-paths against its active harness root and owns the idea list, closure, review and intent classification.
- Projection (`project(state) -> {snapshot, next}`) is a pure function with no I/O.

## Alternatives Considered

- **Service renders instruction bodies or panels** — rejected: violates the harness fetch rules, since only the caller knows its active harness root and can resolve `@`-paths.
- **Rich `next` with embedded content plus pointer** — rejected: duplicates the `Active step:` pointer mechanism and risks drift between rendered content and step files.

## Consequences

- The sidecar stays harness-agnostic with identical behavior for both harnesses.
- No rendered-content versus step-file drift is possible; the pointer is the single reference.
- Projection stays pure and directly testable with no I/O surface.

## Related

- Change `state-machine-sidecar` — `design.md` D4
- ADR 0178 — the uniform envelope carrying this `next` shape
- ADR 0181 — the hosted machine whose projection obeys this rule
