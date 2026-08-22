# DDR 0109c: Progress plans are declared, canonical, and immutable; the coordinator renders and marks only

## Status

Accepted

## Context

A routed phase coordinator is phase-blind by contract (`sai/orchestration/coordinator-contract.md:44-45`: "The coordinator never reads artifacts, resolves phase data, or invents phase-specific payload fields"), while the worker that knows the phases runs in its own context — so neither side alone can produce a useful live task list. No SAI surface defined a task-list convention, and every routed agent improvised progress presentation.

## Decision

A routed phase adapter MAY declare a static, ordered `progress_plan` (each step a stable `id` plus a user-facing `label`) alongside the closed phase-adapter field set. The plan is canonical with the phase's worker contract — the worker contract enumerates the ids the worker may report and the adapter declares exactly those ids in the same order — and is immutable for the invocation. The coordinator holds it in invocation-scoped state, marks steps only from worker progress events, derives rendered states from plan order plus the marked set, and never derives, infers, or extends the plan. The worker never authors steps; it reports only canonical ids, so the two-string invocation envelope stays closed.

## Alternatives Considered

- **Coordinator derives the plan from progress events** — rejected: the coordinator is phase-blind by contract; inference would duplicate phase knowledge and contradict render-and-mark-only.
- **Worker authors steps** — rejected: the worker reports only canonical ids, so the plan stays coordinator-owned and the envelope stays closed.
- **Plan carried in the dispatch envelope** — rejected: breaks the closed two-string envelope; the plan is declared inline by the adapter and held in coordinator state instead (see DDR 0114).

## Consequences

The plan becomes a load-bearing contract surface shared by the adapter, the worker contract, and both harness bindings; removing it later touches every routed phase. A later phase adopting the protocol declares its own plan and mirrors the ids in its worker contract — mechanical once the pattern is proven, and delayed until the design-phase proof lands. The decision states a property that must hold of the pipeline's records and behavior at all times, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D1.
