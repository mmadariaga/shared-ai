# ADR 0139a: Use fresh read-only reviewers with worker-owned artifact edits

## Status

Accepted

## Context

The spec and design workers must review the artifacts they author without leaking worker reasoning, lifecycle state, prior reviewer state, or unrelated repository context into the judgment. Allowing a reviewer to edit artifacts directly or continuing one reviewer across passes would weaken isolation and blur write ownership.

## Decision

Each worker-owned planning-artifact review pass creates one fresh isolated reviewer. The reviewer receives only the phase's freshly read reviewed set and read-only reference set, has no write capability, and returns findings under the shared artifact-review contract. The phase worker evaluates every finding, performs every accepted artifact edit, re-verifies changed artifacts, and recomputes its decision summary when an edit was accepted.

## Alternatives Considered

- **Continue one reviewer across passes** — rejected because prior findings and reasoning could influence later passes outside the declared input set.
- **Allow the reviewer to edit artifacts** — rejected because it would split artifact ownership and make finding disposition less accountable.
- **Route findings through the supervised pipeline adapter** — rejected because standalone routed phases need the same worker-owned behavior and the supervised review loop remains an independent layer.

## Consequences

- Every pass pays fresh-dispatch cost and re-reads its exact input set.
- Reviewers remain read-only and findings can target only phase-authored artifacts.
- The phase worker remains the sole writer and owns verification after accepted corrections.

## Provenance

User — `openspec/changes/spec-design-review-progress-step/design.md` Decision 2 records the choice and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/spec-design-review-progress-step/specs/planning-artifact-review-loop/spec.md`
- `sai/policies/artifact-review-contract.md`
- `/sai-1-spec` and `/sai-2-design`

<!-- adr-index: refs ddr:0105 -->
