# DDR 0157: Fast-lane validation and mutation stay in separate actors

<!-- ddr-index: refs ddr:0156, refs adr:0172d -->

## Status

Accepted

## Context

Retroactive drafts must be schema-validated before any bytes land, but the session that validates them (explore's coordinator) is contractually read-only in item 1, while the actor that composes drafts (the backfill worker) is contractually prohibited from writing. The fast lane needs both judgments and mutations without breaking either prohibition.

## Decision

1. Validation of draft CONTENT against `openspec/schemas/sai-workflow/schema.yaml` is a read-and-reason act performed by the coordinating session; it never writes.
2. Every validated mutation — exact-path artifact writes, spec sync, the archive move, owned staging, and the commit — is executed by the `sai-autofast-hands-worker` closed-order executor.
3. The hands worker rejects any order outside its closed list; defense against a malformed order lives in the receiver, not in the hope of a well-composed prompt.

## Alternatives Considered

- Let explore write validated artifacts directly — rejected because it grants explore a direct write tool, breaking item 1's stance.
- Extend the backfill worker to write after external validation — rejected because it breaks its absolute mutation prohibition and couples composition with materialization across a validation boundary.
- Recycle the generic budget-executor as hands — rejected because the mutation contract would scatter into per-invocation prompts instead of living in one card.

## Consequences

- One additional managed worker exists solely for the fast lane; it loads only when the option is selected.
- A failed validation stops before any mutation; nothing is written until content is fully valid.
- The split is encoded for real explore sessions; an orchestrating main session outside explore that already holds native write tools still routes mutations through the hands contract to keep the discipline testable.

## Related

- `docs/ddr/0159-fast-lane-selection-pre-authorizes-one-local-commit.md`
- `docs/adr/0172d-sibling-worker-dispatch-for-the-fast-lane.md`
