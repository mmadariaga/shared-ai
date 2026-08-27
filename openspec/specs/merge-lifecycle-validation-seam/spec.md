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

### Requirement: Merge lifecycle transitions use an exhaustive deterministic table

The merge lifecycle validator MUST permit only the transitions listed in the lifecycle transition table. Each permitted transition SHALL validate its required `operation_context` before the next operation is selected.

#### Scenario: Clean merge follows the clean path

- **WHEN** the current state is `merge-outcome`, the target state is `adr-ddr`, and `operation_context.merge_outcome` is `clean`
- **THEN** the validator returns `valid` and the lifecycle skips language selection, scope selection, contextual analysis, resolution, and verification

#### Scenario: Conflicted merge enters language selection first

- **WHEN** the current state is `merge-outcome`, the target state is `language-selection`, and `operation_context.merge_outcome` is `conflicted`
- **THEN** the validator returns `valid` and the conflicted path requires language selection before conflict analysis

### Requirement: Merge gate preconditions are explicit

The validator SHALL require resolved language, eligible scope or fast-track full scope, confirmed strategy with a complete validated resolution payload, complete staged resolution writes, an accepted verification result, completed ADR/DDR collision handling, and resolved authorization context at their respective boundaries.

#### Scenario: Fast-track bypasses only scope selection

- **WHEN** a conflicted merge has a non-empty resolved working language and `fast_track_active` supplies the full scope
- **THEN** the scope gate is satisfied implicitly while language selection, contextual analysis, resolution, verification, ADR/DDR handling, and authorization remain required

#### Scenario: Verification proceeds only after an accepted result

- **WHEN** the current state is `verification`, the target state is `adr-ddr`, and `verification_result` is `passed` or `cap-exhausted`
- **THEN** the validator returns `valid`

### Requirement: Invalid lifecycle transitions are rejected before operation selection

An unlisted transition or a transition with missing or unsatisfied context MUST return `invalid` with the current state, target state, and violated precondition.

#### Scenario: Missing context prevents operation selection

- **WHEN** a transition is requested without its required operation context
- **THEN** the validator returns `invalid` and no operation, worker dispatch, mutation, or presentation update is selected
