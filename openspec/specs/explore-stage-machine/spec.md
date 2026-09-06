# explore-stage-machine Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Deterministic stage transitions

The `explore-stage` machine SHALL advance stages only on explicit caller-supplied intent signals plus the deterministic empty-list auto-advance, and SHALL never advance on model readiness judgment.

#### Scenario: Intent advances, readiness does not

- **WHEN** the caller emits a stage event without an explicit intent signal and the idea list is non-empty
- **THEN** the machine rejects the advance and returns the current state's pointer instead of moving to the next stage

#### Scenario: Empty list auto-advances deterministically

- **WHEN** the caller emits the stage event against a deterministically empty idea list
- **THEN** the machine advances without requiring an intent signal and returns the next stage's pointer

### Requirement: Pure projection

The machine's projection from state to caller-facing output SHALL be a pure function of the state with no I/O, and the service SHALL never render panels, lists, or instruction bodies.

#### Scenario: Same state projects identically

- **WHEN** the same machine state is projected twice
- **THEN** both projections return the identical snapshot and `next` pointer with no side effects and no rendered content

### Requirement: Caller-owned panel, closure, and review loop

Panel ownership, marking hooks, the `Result Loop`, chat `Closure State` ownership, and intent classification SHALL stay caller-side and out of the machine; the machine defines transitions and the caller orchestrates presentation and review.

#### Scenario: Machine never renders or reviews

- **WHEN** a transition succeeds for a session with panel and review surfaces active
- **THEN** the response carries only state, snapshot, and the `next` pointer while the caller alone updates the idea list, owns closure, and runs any review loop

### Requirement: Snapshot carriage and restore

Every machine response SHALL carry the snapshot the caller must retain in conversation, and `restore` SHALL accept the last carried snapshot to re-establish the session after respawn.

#### Scenario: Compaction-safe continuation

- **WHEN** the chat compacts and the caller restores the sidecar from the last carried snapshot
- **THEN** the machine resumes at the snapshotted state and its next transition returns the pointer consistent with that state

### Requirement: Stage-machine PoC scope

The machine SHALL absorb the explore stage-progression rules into its transition table and SHALL leave the `Result Loop`, chat `Closure State` ownership, and intent classifiers outside the PoC.

#### Scenario: Absorbed rules transition, excluded surfaces stay out

- **WHEN** an emission exercises a stage-progression rule versus a `Result Loop` or intent-classifier behavior
- **THEN** the machine deterministically decides the former and rejects or ignores the latter as out of scope with the current state's pointer

