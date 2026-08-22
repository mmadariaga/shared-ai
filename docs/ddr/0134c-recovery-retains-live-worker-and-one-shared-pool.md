# DDR 0134c: Recovery retains the live worker and one shared attempt pool

## Status

Accepted

## Context

Recovery depends on the active worker's invocation journal and nested dispatch state. A replacement worker starts with an empty journal by contract, while separate budgets per failure class or nested dispatch could exceed the promised bound.

## Decision

Every bounded recovery attempt continues the same live worker. All attempts in an invocation draw from one pool capped at three, regardless of failure-class changes or nested overview-generation re-dispatches. Recovery never dispatches a replacement worker; ordinary continuation failure outside recovery retains its existing replacement fallback.

## Alternatives Considered

- **Replacement-worker recovery** — rejected because replacement reconstruction does not carry the prior worker journal or nested dispatch state.
- **Per-class or nested-dispatch budgets** — rejected because they can multiply attempts beyond the invocation bound.
- **One live-worker pool** (chosen) — preserves repair state while providing a deterministic upper bound.

## Consequences

- Recovery remains state-safe and bounded to three attempts per invocation.
- Failure-class changes do not reset or split the budget.
- Losing the live continuation ends recovery immediately rather than falling back to a replacement.

## Provenance

User — `openspec/changes/bounded-worker-recovery/design.md`, Decision 2.
