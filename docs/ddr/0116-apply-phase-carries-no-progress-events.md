# DDR 0116: The apply phase carries no progress events because it has no coordinator-worker boundary

<!-- adr-index: refs 0110 -->

## Status

Superseded by [DDR 0137](./0137-apply-routed-boundary-carries-progress-events.md)

## Context

The routed planning phases emit nonterminal progress events (`event: progress` carrying `step_ids` and `changed_files`) that the coordinator renders as a live task list and marks from (`worker-lifecycle-protocol`, DDR 0110). `/sai-4-apply` has a different shape: it coordinates long multi-step runs entirely in the main session, dispatching Step-execution subagents directly with no coordinator-worker boundary. There is no worker to emit events from and no coordinator to receive them — so any attempt to reuse the routed progress protocol would introduce an event channel where no boundary exists.

## Decision

The apply phase introduces no progress protocol: no plan declaration, no progress payload, no acknowledgement, and no change to the worker lifecycle or the coordinator contract. The task list `/sai-4-apply` renders is derived by the coordinator directly from the artifact — the `#### Step N:` headings of `implementation.md` (DDR 0115) — and marked in the same batched update as the on-disk checkboxes, never from worker events.

## Alternatives Considered

- **Reuse the routed progress protocol** — rejected: apply has no coordinator-worker boundary, so there is no worker to emit events from and no coordinator to receive them.
- **Coordinator-derived projection with no protocol** — chosen: the list is a projection of the artifact that already exists on disk.

## Consequences

Adding a progress protocol later would change the coordinator contract and the worker lifecycle, so the boundary-free derivation is load-bearing for the apply phase. The decision states a constraint the pipeline's domain imposes on its behavior at all times — the apply phase carries no progress events because it has no coordinator-worker boundary — which is why this record is a DDR.

## Provenance

User — `no-progress-protocol` is a user-approved spec requirement. Recorded as Decision 6 in `design.md` with the `ddr` family marker.
