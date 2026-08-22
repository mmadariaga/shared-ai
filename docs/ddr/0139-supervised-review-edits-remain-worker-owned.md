# DDR 0139: Supervised review edits remain worker-owned

## Status

Accepted

## Context

Moving supervised review into the active explore session could make direct coordinator edits appear simpler. Direct edits would split ownership of planning artifacts, bypass the shared per-finding legitimacy gate, and make partial worker state harder to reason about.

## Decision

The Review Engine and explore coordinator remain read-only for every supervised review round. Each finding is continued through the phase-specific machine-feedback path to the same phase worker. Only that worker may accept or specifically discard the finding, edit its owned artifacts, verify the resulting artifacts, and recompute its decision summary.

## Alternatives Considered

- **Let explore apply findings directly** — rejected because it would create two writers for the same planning artifacts.
- **Let the Review Engine apply corrections** — rejected because the engine is a reusable read-only evidence boundary.
- **Batch findings into an unvalidated replacement artifact** — rejected because it bypasses per-item legitimacy and same-worker continuation.

## Consequences

Artifact ownership remains singular across standalone and supervised flows. In-session review changes who forms findings, not who writes artifacts or judges each proposed correction.

## Provenance

User — `openspec/changes/supervised-in-situ-review/design.md` records the choice and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/supervised-in-situ-review/specs/artifact-feedback-gate/spec.md`
- `openspec/changes/supervised-in-situ-review/specs/supervised-review-in-session/spec.md`
- `/sai-explore`

<!-- adr-index: refs adr:0139a -->
