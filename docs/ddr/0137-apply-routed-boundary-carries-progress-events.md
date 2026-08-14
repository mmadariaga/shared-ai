# DDR 0137: The apply routed boundary carries progress events against immutable dispatch-local plans

<!-- adr-index: supersedes 0116 -->

## Status

Accepted

## Context

DDR 0116 recorded that `/sai-4-apply` carried no progress events because it had no coordinator-worker boundary: the phase coordinated long multi-step runs entirely in the main session, dispatching Step-execution subagents directly, so there was no worker to emit events from and no coordinator to receive them. The routed apply architecture replaces that shape: `/sai-4-apply` is now a routed command with a coordinator-worker boundary — the coordinator (main session) dispatches RED and GREEN Step-execution workers on the budget tier, and the shared worker lifecycle applies to those dispatches.

## Decision

The apply phase now has a coordinator-worker boundary, and only dispatched workers emit additive progress against the immutable dispatch-local plan the coordinator declared for that dispatch. A worker returns an `event: progress` payload carrying exactly `step_ids: string[]` and `changed_files: string[]` to report completed milestones in its own plan — a RED dispatch's `test-authoring` then `red-verification`, a GREEN dispatch's `implementation` then `green-verification`, and a green-exception RED dispatch's `test-authoring` then `green-verification`. The dispatch-local plan is static, fully known before the first worker result of that dispatch, immutable for that dispatch's lifecycle (including its same-worker recovery continuations), and never carried in the dispatch envelope.

The run-start Step Projection remains coordinator-owned and protocol-free: it is derived by the coordinator from the `#### Step N:` headings of `implementation.md`, mirrors the on-disk checkboxes, and is never marked from worker progress events — the projection is not the per-dispatch apply progress plan, and the task-list tool call originates from the coordinator session only.

## Alternatives Considered

- **Keep the boundary-free derivation (DDR 0116)** — rejected: the routed apply architecture introduces managed RED and GREEN Step-execution workers, so a worker lifecycle boundary exists and the shared progress protocol applies to it.
- **A run-wide progress plan for apply** — rejected: each Step dispatch is its own invocation-scoped lifecycle with its own static milestone plan, so the plan is per-dispatch, never run-wide.

## Consequences

Only dispatched workers emit additive progress against immutable dispatch-local plans; the coordinator never emits progress for the run-start Step Projection, which remains a protocol-free, coordinator-derived mirror of the on-disk checkboxes. The decision states a constraint the pipeline's domain imposes on its behavior at all times — the apply boundary carries progress events per dispatched worker against immutable dispatch-local plans, and the projection is never marked from them — which is why this record is a DDR. This decision supersedes DDR 0116, whose historical decision text is preserved in that record.

## Provenance

User — the routed apply boundary is an approved spec requirement (`apply-routed-card-set`, `apply-step-projection`, `apply-coordinator-ownership`). Recorded as a design decision with the `ddr` family marker.
