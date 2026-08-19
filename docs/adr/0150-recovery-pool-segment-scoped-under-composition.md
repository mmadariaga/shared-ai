# ADR 0150: Recovery pool is segment-scoped under composition

<!-- adr-index: amends 0139; refs 0147 -->

## Status

Accepted

## Context

ADR 0139 made `recovery_policy: true` an immutable invocation-level opt-in with a fixed three-attempt pool. Under multi-adapter composition, a depleted earlier segment would starve a later segment (for example chained apply) if the pool stayed invocation-scoped across the whole run.

## Decision

When `recovery_policy: true`, the shared runner creates one three-attempt pool immutable for the active adapter segment and discards it when the segment ends. A later segment that also declares `recovery_policy: true` receives a fresh pool. Under composition, the pre-delta phrase "immutable for the invocation" means "immutable for the active adapter segment"; one-adapter invocations keep segment scope identical to today's invocation scope.

## Alternatives Considered

- **Single invocation-scoped pool across all segments** — rejected; a depleted earlier segment would starve chained apply recovery.
- **Segment-scoped pool with fresh budget per `recovery_policy: true` segment** (chosen) — preserves single-adapter reading while giving each composed segment a full budget.

## Consequences

- Chained apply always starts recovery with three attempts regardless of earlier segments.
- Existing one-adapter recovery pins remain valid when segment equals invocation.
- Progress-plan immutability follows the same active-segment reading under composition.

## Provenance

User — `openspec/changes/chainable-apply-phase-adapter/design.md`, Decision D4.
