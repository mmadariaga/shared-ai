# DDR 0133b: Review progress is marked only by no-High pass evidence

## Status

Accepted

## Context

Ordinary successful reconciliation marks every remaining progress step complete. Applying that rule to a planning phase's `review` step would claim that artifact-review evidence exists even when no completed pass reported `High=0`.

## Decision

The `review` step in the spec and design progress plans is evidence-marked. Only a worker progress event backed by a completed review pass reporting `High=0` marks it. At each phase's successful reconciliation trigger, every other unmarked step is reconciled to `completed`, while an unmarked evidence-marked `review` step is left exactly as last rendered. The designation, not the bare id, scopes the exception.

## Alternatives Considered

- **Reconcile every step uniformly** — rejected because it would fabricate evidence.
- **Add a warning or failure state** — rejected because the progress-state vocabulary remains unchanged.
- **Carry review evidence in terminal payloads** — rejected because the closed lifecycle payload and worker-owned progress marking are preserved.

## Consequences

Successful runs may intentionally close with `review` not rendered `completed`. Other plans containing a step named `review` reconcile normally, and failed, cancelled, or needs-input outcomes continue to freeze the rendered list.

## Provenance

User — `openspec/changes/spec-design-review-progress-step/design.md` Decision 1 records the invariant and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/spec-design-review-progress-step/specs/review-step-evidence-marking/spec.md`
- `openspec/changes/spec-design-review-progress-step/specs/coordinator-progress-ownership/spec.md`
- `/sai-1-spec` and `/sai-2-design`

<!-- adr-index: refs 0109c; refs 0110; refs 0111 -->
