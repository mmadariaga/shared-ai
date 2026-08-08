# DDR 0111: Rendered progress state is a pure function of the declared plan order plus the marked set

## Status

Accepted

## Context

Progress events may complete later plan steps while an earlier step remains unmarked, and batches arrive in the coordinator's own order. Rendering must stay deterministic for a phase-blind coordinator that may not read artifacts or git state to confirm progress.

## Decision

Each rendered step's state derives from plan order and the marked set only: a step whose id is in the marked set renders `completed`; the first step in plan order whose id is not in the marked set renders `in_progress`; every remaining step renders `pending`. When every step is marked all render `completed`; when none is marked the first renders `in_progress`. Plan order governs — never batch contiguity, batch order, or event arrival order. The full plan renders at dispatch (first step `in_progress`, rest `pending`). At run-closing results the coordinator reconciles: `completed` renders every unmarked step `completed`; `failed` and `cancelled` freeze the list as last rendered; a `needs_input` result — a terminal lifecycle status but not a run-closing one — leaves the list exactly as last rendered because the run pauses for user input and resumes.

## Alternatives Considered

- **Derive state from batch contiguity or event order** — rejected: violates the non-contiguous-batch scenario; the marked set is order-free.
- **Coordinator reads artifacts or git state to confirm progress** — rejected: render-and-mark-only forbids artifact reads.

## Consequences

Both bindings and the coordinator derive visible states from this rule, so changing the derivation changes user-visible behavior on both harnesses — hard to reverse. The decision states a property of the rendered list that must hold at all times, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D3.
