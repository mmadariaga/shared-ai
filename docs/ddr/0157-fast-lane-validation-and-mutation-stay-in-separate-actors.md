# DDR 0157: Fast-lane validation and mutation stay in separate actors

<!-- ddr-index: refs ddr:0156, refs adr:0172d -->

## Status

Accepted

## Context

Retroactive drafts must be schema-validated before any bytes land, but the session that validates them (explore's coordinator) is contractually read-only in item 1, while the actor that composes drafts (the backfill worker) is contractually prohibited from writing. The fast lane needs both judgments and mutations without breaking either prohibition.

## Decision

1. Validation of draft CONTENT against `openspec/schemas/sai-workflow/schema.yaml` is a read-and-reason act performed by the coordinating session; it never writes.
2. Backfill and archive each use an explicit `--autofast-prepare` result followed by one coordinator-validated `--autofast-execute` continuation on the same existing worker.
3. Backfill execution owns only the exact validated draft writes; archive execution owns only the validated sync, archive move, owned staging, and one local commit, in that order.
4. Each worker rejects an order outside its closed list; defense against a malformed order lives in the receiver, not in the hope of a well-composed prompt.

## Alternatives Considered

- Let explore write validated artifacts directly — rejected because it grants explore a direct write tool, breaking item 1's stance.
- Let the coordinator execute an unbounded order after validation — rejected because the receiver must enforce the exact path and action boundary.
- Add a dedicated mutation worker — rejected because the existing backfill and archive workers already own the corresponding technical contracts and preserve the harness parity seam.

## Consequences

- No additional managed worker or install projection exists solely for Auto-fast mutation execution.
- A failed validation stops before any mutation; nothing is written until content is fully valid.
- The split is encoded for real explore sessions; an orchestrating main session outside explore still routes mutation through the same prepare/execute contracts to keep the discipline testable.

## Related

- `docs/ddr/0159-fast-lane-selection-pre-authorizes-one-local-commit.md`
- `docs/adr/0172d-sibling-worker-dispatch-for-the-fast-lane.md`
