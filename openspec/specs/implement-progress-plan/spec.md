# implement-progress-plan — Spec

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: implement-plan-steps-match-workflow

The visible phase plan SHALL retain exactly prereqs-resolution, collapse-implemented-steps, artifact-analysis, documentation-review, plan-generation, and validation in that order, with no specs-approval milestone. The coordinator SHALL execute resolution and common-work milestones once from the existing library, preserve rerun content in a candidate, and own audit append and final verification. Category workers SHALL receive complete assigned-Step tasks and emit no milestone progress. Coordinator-authored observations SHALL validate through the progress validator, using only its received_at stamp. Plan-generation and validation SHALL complete only after verified publication; unsuccessful or input-paused results SHALL retain the last rendered state.

#### Scenario: workflow steps map to plan steps

- **WHEN** the coordinator completes common work or verified publication
- **THEN** each completed act is recorded under the corresponding canonical milestone without worker pointer-driven progress.

#### Scenario: no approval step in the implementation plan

- **WHEN** the visible phase plan is inspected
- **THEN** it contains exactly the six canonical milestones and no specs-approval milestone.

#### Scenario: validation step covers the durable verification

- **WHEN** the coordinator verifies the complete candidate and audit-derived append
- **THEN** validation remains incomplete until successful publication and no failed verification produces a completed phase claim.

### Requirement: Validation owns durable implementation-plan verification

The coordinator SHALL use validation.md as the technical source for implementation-plan invariants and audit-step verification, applying it to the candidate before publication. A failed check SHALL produce a non-completed phase outcome and preserve the previous durable plan.

#### Scenario: Durable validation fails

- **WHEN** a required implementation-plan or audit-step check fails
- **THEN** publication and phase completion remain blocked.
