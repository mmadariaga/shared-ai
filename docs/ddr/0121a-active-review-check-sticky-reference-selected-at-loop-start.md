# DDR 0121a: The active review check is a sticky chat-scoped reference selected once at loop start

## Status

Accepted

## Context

The post-crystallization review loop (item 9 of `sai/instructions/explore.md`) iterates the tracked crystallized set and presents a four-option picker per change (`Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, `Skip`). The idea progress list (item 11) renders each slice's two review items with a status, but with a `pending | completed` vocabulary only, nothing indicates which review check the loop is currently processing. A render-only `in_progress` state for the active review check was proposed, which requires pinning how the active check is selected and how it moves.

## Decision

The active review check is selected once when the loop begins processing a change — the slice's first not-completed review item in fixed order (reviewed-sai-1 first, else reviewed-sai-2; none when both are completed) — and held as a sticky chat-scoped reference that is never recomputed from later marks or clears, moves only forward, and moves only when the active item is itself marked completed by a `High=0` tally. `Skip` for the change or loop close resolves the state.

## Alternatives Considered

- **Recompute the active at each render from the current marks** — rejected: after a High-finding review clears a non-active earlier item, recomputation would re-select that earlier item and move the active backward, violating both "clearing a non-active review item does not move the active" and "the active moves only forward".
- **A single shared "active-change" session key** — rejected: it conflates loop iteration state with the per-slice item-level stickiness the spec requires.

## Consequences

The active is mutated only by its own completion (advance) or by `Skip`/loop close (resolve). The semantics are spec-pinned by `idea-list-review-in-progress-state` (15 scenarios) and ripple through instruction prose and both render bindings; reversing later means a spec amendment plus re-testing the scenario matrix. This record is a DDR because forward-only stickiness is a property that must hold of the idea progress list's render state at all times, stated as a property of the domain rather than as the mechanism that upholds it.

## Provenance

User — the sticky-reference semantics are a user-approved design decision (design.md D1 of `idea-list-review-in-progress`).
