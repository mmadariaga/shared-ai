# merge-lifecycle-validation-seam Specification

## Purpose
TBD.

## Requirements

### Requirement: Defined merge lifecycle states and paths

The merge lifecycle validation seam MUST define the closed lifecycle states `preflight`, `branch-selection`, `merge-outcome`, `language-selection`, `scope-selection`, `contextual-analysis`, `resolution`, `verification`, `adr-ddr`, `authorization`, and `terminal`, including the clean and conflicted paths between those states.

#### Scenario: Coordinator tracks a merge outcome

- **WHEN** the coordinator records a clean or conflicted merge result
- **THEN** the lifecycle state advances from `merge-outcome` through the corresponding defined path without changing existing merge behavior

### Requirement: Coordinator transition validation boundary

Before selecting the next merge operation, the coordinator SHALL validate the transition with `validate_transition(current_state, target_state, operation_context)`. A permitted transition returns `valid`; an invalid transition SHALL halt the operation and report the lifecycle violation without executing it. The current placeholder returns `valid` for all transitions to preserve existing behavior.

#### Scenario: Coordinator reaches an operation boundary

- **WHEN** the coordinator is about to select a merge launch, conflict analysis, scope selection, resolution, verification, ADR/DDR check, authorization, or terminal operation
- **THEN** it consults the lifecycle validation seam before selecting that operation

### Requirement: Neutral coordinator and worker ownership

The lifecycle validation seam SHALL remain neutral for Claude Code and opencode, SHALL keep lifecycle policy under coordinator control, and MUST NOT dispatch workers, perform Git mutations, write resolutions, or transfer mutation ownership from the coordinator.

#### Scenario: Conflict analysis and mutation remain separated

- **WHEN** the merge flow reaches conflict analysis or a coordinator-owned mutation boundary
- **THEN** the seam validates lifecycle state while the worker remains analysis-only and the coordinator retains all mutation responsibility