# explore-stage-machine Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Deterministic stage transitions

The `explore-stage` machine SHALL advance stages only on explicit caller-supplied intent signals plus the deterministic content-based empty-set rules, and SHALL never advance on model readiness judgment. The content-based rules are: at the `review-edge-cases` stage, when the recorded edge-case list is empty, the machine advances without requiring intent; at the `implementation-details` stage, when the recorded implementation-details list is empty, the machine advances without requiring intent. These rules fire only on their own stages' recorded lists; all other stage transitions require explicit intent. To distinguish recorded empty from unrecorded, the state carries `edgeCaseList` and `implementationDetailsList` as null when unrecorded and as an array (including empty array) when recorded. The machine SHALL consume a `recordedList` event: a non-null `recordedList` records the supplied list into the current stage's own list (`ideaList` at `explore-change`, `edgeCaseList` at `review-edge-cases`, `implementationDetailsList` at `implementation-details`) without advancing the stage; recording and advancing remain separate emits, and a recorded empty list advances only on a later no-intent emit per the content-based empty-set rule. The explore command (the primary caller) retains intent recognition, dominant-intent classification, and list-agreement semantics on the caller side.

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

#### Scenario: Recording records without advancing

- **WHEN** the caller emits a `recordedList` event at a stage that owns a list
- **THEN** the supplied list records into that stage's own list and the stage does not advance

#### Scenario: Recording an empty list does not advance by itself

- **WHEN** the caller emits an empty `recordedList` at `review-edge-cases` or `implementation-details`
- **THEN** the list records as recorded-empty and the stage stays until a later no-intent emit fires the content-based empty-set rule

### Requirement: Pure projection

The machine's projection from state to caller-facing output SHALL be a pure function of the state with no I/O, and the service SHALL never render panels, lists, or instruction bodies.

#### Scenario: Same state projects identically

- **WHEN** the same machine state is projected twice
- **THEN** both projections return the identical snapshot and `next` pointer with no side effects and no rendered content

### Requirement: Caller-owned panel, closure, and review loop

Panel ownership, marking hooks, the `Result Loop`, chat `Closure State` ownership, and intent classification SHALL stay caller-side and out of the machine; the machine defines transitions and the caller orchestrates presentation and review. Explore retains the authority to recognize intent tokens, classify dominant intent, confirm list agreement semantically, and manage panel ownership transitions (phase-A stage TODO to phase-B idea progress list).

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

### Requirement: Single-level emit outcome

The `/emit` route of the `explore-stage` sidecar SHALL return exactly one level of outcome — `{state, snapshot, next}` — where `state` is the plain machine state (`state.stage` a string), `snapshot` is the machine's own snapshot for the returned state, and `next` is the current pointer. The route SHALL store the returned plain state as session state and SHALL NOT re-wrap `transition()`'s return into a nested envelope. A no-intent emit that triggers neither recording nor a content-based empty-set rule SHALL return the current state in-band with the rejection marker `rejected: READINESS_IS_NOT_INTENT` instead of advancing, and a replayed `eventId` SHALL return the identical stored outcome without applying the event twice.

#### Scenario: Single-level envelope and monotonic stage walk

- **WHEN** the caller POSTs a `next-step` event to the live `/emit` route and repeats it across consecutive turns
- **THEN** every response carries exactly the keys `state`, `snapshot`, and `next` with `state.stage` a plain string, and consecutive emits walk `explore-change` → `review-edge-cases` → `implementation-details` → `crystallize` without resetting to an earlier stage

#### Scenario: No-intent emit rejects in-band

- **WHEN** the caller emits a stage event with no explicit intent where neither recording nor an empty-set rule applies
- **THEN** the response carries the `rejected: READINESS_IS_NOT_INTENT` marker and returns the current state without advancing

#### Scenario: Replayed eventId returns the identical outcome

- **WHEN** the same `eventId` is emitted twice
- **THEN** the second response returns the identical stored outcome and the stage does not advance twice

#### Scenario: Restore returns the carried snapshot state

- **WHEN** the caller POSTs the last conversation-carried snapshot to `/restore`
- **THEN** the restored state equals the snapshotted machine state and the next transition continues from it

### Requirement: HTTP seam live test coverage

The `explore-stage` HTTP seam SHALL have test coverage exercised against the live sidecar server covering consecutive stage advances, list recording, empty-set auto-advance, idempotent replay, and no-intent rejection. The machine and sidecar code SHALL stay stdlib-only with no OS-conditional paths, and the suite SHALL run on Windows and Linux.

#### Scenario: Live seam suite runs identically on both platforms

- **WHEN** the sidecar test suite runs on Windows or Linux
- **THEN** the live-server seam tests pass with `spawn` → `emit` → `restore` → `close` behaving identically on both platforms and no OS-conditional code paths

