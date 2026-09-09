# explore-stage-machine Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Deterministic stage transitions

The `explore-stage` machine SHALL advance stages only on explicit caller-supplied intent signals plus the deterministic content-based empty-set rules, and SHALL never advance on model readiness judgment. The content-based rules are: at the `review-edge-cases` stage, when the recorded edge-case list is empty, the machine advances without requiring intent; at the `implementation-details` stage, when the recorded implementation-details list is empty, the machine advances without requiring intent. These rules fire only on their own stages' recorded lists; all other stage transitions require explicit intent. To distinguish recorded empty from unrecorded, the state carries `edgeCaseList` and `implementationDetailsList` as null when unrecorded and as an array (including empty array) when recorded.

#### Scenario: Intent advances, readiness does not

- **WHEN** the caller emits a stage event without an explicit intent signal and the stage is not `review-edge-cases` with a recorded empty edge-case list, and not `implementation-details` with a recorded empty implementation-details list
- **THEN** the machine rejects the advance and returns the current state's pointer instead of moving to the next stage

#### Scenario: Empty list auto-advances deterministically

- **WHEN** the caller emits the stage event against the `review-edge-cases` or `implementation-details` stage where the stage's own recorded list is empty and no explicit intent signal
- **THEN** the machine advances without requiring an intent signal and returns the next stage's pointer

#### Scenario: Auto-advance does not fire at other stages, even with empty recorded lists

- **WHEN** the caller emits the stage event against the `explore-change` or `crystallize` stage with or without recorded empty lists
- **THEN** the machine requires an explicit intent signal to advance and rejects the call without it, returning the current pointer

#### Scenario: Unrecorded lists never trigger auto-advance

- **WHEN** the caller emits the stage event at `review-edge-cases` or `implementation-details` where the respective list is null (unrecorded, not yet gathered) and no explicit intent is supplied
- **THEN** the machine rejects the advance without requiring the list to be gathered first and returns the current state's pointer

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

Every machine response SHALL carry the snapshot the caller must retain in conversation, and `restore` SHALL accept the last carried snapshot to re-establish the session after respawn. Snapshots lacking `edgeCaseList` and `implementationDetailsList` fields (from sessions prior to this version) are treated as having those fields as `null` (unrecorded), preserving backward compatibility and the recorded/unrecorded distinction.

#### Scenario: Compaction-safe continuation

- **WHEN** the chat compacts and the caller restores the sidecar from a last-carried snapshot
- **THEN** the machine resumes at the snapshotted state and its next transition returns the pointer consistent with that state

#### Scenario: Old-shape snapshot restore treats missing fields as unrecorded

- **WHEN** a snapshot lacks `edgeCaseList` or `implementationDetailsList` fields
- **THEN** those fields are normalized to `null` during restore, and the transition behaves as though the lists were never recorded

### Requirement: Stage-machine PoC scope

The machine SHALL absorb the explore stage-progression rules into its transition table and SHALL leave the `Result Loop`, chat `Closure State` ownership, and intent classifiers outside the PoC.

#### Scenario: Absorbed rules transition, excluded surfaces stay out

- **WHEN** an emission exercises a stage-progression rule versus a `Result Loop` or intent-classifier behavior
- **THEN** the machine deterministically decides the former and rejects or ignores the latter as out of scope with the current state's pointer

