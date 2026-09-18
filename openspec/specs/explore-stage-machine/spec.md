# explore-stage-machine Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.

## Requirements

### Requirement: Deterministic stage transitions

The `explore-idea` machine SHALL advance stages only on explicit caller-supplied intent signals plus the deterministic content-based empty-set rules, and SHALL never advance on model readiness judgment. The content-based rules are: at the `review-edge-cases` stage, when the recorded edge-case list is empty, the machine advances without requiring intent; at the `implementation-details` stage, when the recorded implementation-details list is empty, the machine advances without requiring intent. These rules fire only on their own stages' recorded lists; all other stage transitions require explicit intent. To distinguish recorded empty from unrecorded, the state carries `edgeCaseList` and `implementationDetailsList` as null when unrecorded and as an array (including empty array) when recorded. The machine SHALL consume a `recordedList` event: a non-null `recordedList` records the supplied list into the current stage's own list (`ideaList` at `explore-change`, `edgeCaseList` at `review-edge-cases`, `implementationDetailsList` at `implementation-details`) without advancing the stage; recording and advancing remain separate emits, and a recorded empty list advances only on a later no-intent emit per the content-based empty-set rule. The explore command (the primary caller) retains intent recognition, dominant-intent classification, and list-agreement semantics on the caller side. The machine id SHALL be `explore-idea@1`. Emit of retired `explore-stage@1` SHALL be `UNKNOWN_MACHINE` with no alias.

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

#### Scenario: Retired explore-stage id has no alias

- **WHEN** the caller emits with `machineId: "explore-stage@1"`
- **THEN** the sidecar returns `UNKNOWN_MACHINE` and does not route to `explore-idea@1`

### Requirement: Pure projection

The machine's projection from state to caller-facing output SHALL be a pure function of the state with no I/O, and the service SHALL never render panels, lists, or instruction bodies.

#### Scenario: Same state projects identically

- **WHEN** the same machine state is projected twice
- **THEN** both projections return the identical snapshot and `next` pointer with no side effects and no rendered content

### Requirement: Caller-owned panel, closure, and review loop

Panel ownership, marking hooks, the `Result Loop`, chat `Closure State` ownership, and intent classification SHALL stay caller-side and out of the machine; the machine defines transitions and the caller orchestrates presentation and review. Explore retains the authority to recognize intent tokens, classify dominant intent, confirm list agreement semantically, and manage panel ownership transitions (phase-A stage TODO to phase-B idea progress list).

#### Scenario: Machine never renders or reviews

- **WHEN** a transition succeeds for a session with panel and review surfaces active
- **THEN** the response carries only the minimal wire outcome (`stage`, `next`, and the optional `rejected` and `warnings` attributes) while the caller alone updates the idea list, owns closure, and runs any review loop

### Requirement: Stage-machine PoC scope

The machine SHALL absorb the explore stage-progression rules into its transition table and SHALL leave the `Result Loop`, chat `Closure State` ownership, and intent classifiers outside the PoC.

#### Scenario: Absorbed rules transition, excluded surfaces stay out

- **WHEN** an emission exercises a stage-progression rule versus a `Result Loop` or intent-classifier behavior
- **THEN** the machine deterministically decides the former and rejects or ignores the latter as out of scope with the current state's pointer

### Requirement: Single-level emit outcome
The `/emit` route of the `explore-idea` sidecar SHALL return exactly one level of minimal wire outcome — `{stage, next, rejected?, warnings?}` — where `stage` is the current stage string, `next` is the current pointer, `rejected` is the optional in-band rejection marker, and `warnings` is the optional degradation-warning channel. The route SHALL store the plain machine state as session state and SHALL NOT re-wrap `transition()`'s return into a nested envelope or serialize any state object into the response. A no-intent emit that triggers neither recording nor a content-based empty-set rule SHALL return the current stage in-band with the rejection marker `rejected: READINESS_IS_NOT_INTENT` instead of advancing. The implementation SHALL NOT claim eventId replay: `bin/sai-state.js` persists with a fixed empty eventId and never compares `lastEventId`, so a replayed `eventId` MUST NOT be described as returning the stored outcome without re-applying.

#### Scenario: Single-level envelope and monotonic stage walk
- **WHEN** the caller emits a stage event via `emit <id> <machineId> <eventJson>` with machineId `explore-idea@1` across consecutive turns
- **THEN** every response carries exactly the minimal `stage` and `next` keys (plus the optional `rejected` and `warnings` attributes) with `stage` a plain string, consecutive emits walk `explore-change` to `review-edge-cases` to `implementation-details` to `crystallize` without resetting, and the specification makes no idempotent-replay guarantee

#### Scenario: No-intent emit rejects in-band
- **WHEN** the caller emits a stage event with no explicit intent where neither recording nor an empty-set rule applies
- **THEN** the response carries the `rejected: READINESS_IS_NOT_INTENT` marker and returns the current stage without advancing

#### Scenario: Replayed eventId returns the identical outcome
- **WHEN** the same `eventId` is emitted twice
- **THEN** the second response does NOT return the identical stored outcome without re-applying; the transition re-applies, the ledger is persisted for observability only, and `bin/sai-state.js` persists fixed empty eventId and never compares `lastEventId`

#### Scenario: Restore returns the carried snapshot state
- **WHEN** the caller looks for a `/restore` probe with machineId `explore-idea@1` on a chat with a persisted machine
- **THEN** no `/restore` verb exists and state continues only via `spawn` then `emit`; no snapshot is carried, returned, or required

### Requirement: HTTP seam live test coverage

The `explore-idea` local CLI emission SHALL have test coverage exercised against the CLI tool covering consecutive stage advances, list recording, empty-set auto-advance, idempotent replay, no-intent rejection, store-owned state persistence (the record shape with `createdAt`, `stateVersion`, and the per-machine ledger), atomic session-file writes, corruption warnings, cross-process restart replay, and `close` purge semantics. The suite SHALL also cover same-chat `explore-slice@1` emission after `explore-idea@1`, omitted and mistyped `machineId` errors, and the optional restore probe (now demoted to a read-only verb). The machine and CLI code SHALL stay stdlib-only with no OS-conditional paths, and the suite SHALL run on Windows and Linux.

#### Scenario: Live seam suite runs identically on both platforms

- **WHEN** the store CLI test suite runs on Windows or Linux
- **THEN** the `spawn` → `emit` → `close` sequence behaves identically on both platforms and no OS-conditional code paths exist (updated from HTTP sidecar server invocation to local CLI invocation)

### Requirement: Sidecar-owned durable state store

The sidecar SHALL own the `explore-idea` machine state as a durable store: it SHALL persist each machine's state, a minimal per-machine ledger (`rev`, `lastEventId`, `lastOutcome`), and a record `createdAt` in its own session file under the system temp directory, and SHALL reload persisted state automatically. The load SHALL be lazy — state SHALL be seeded from the session file inside the first request flow that already reads it (only when memory lacks the entry, and only for registry-known machine identifiers) — with no dedicated boot call, so the required client cycle is `spawn` then `/emit`. The session-file record SHALL be written atomically (temp file plus rename) so a crash mid-write never leaves a truncated file, and records lacking `stateByMachine` SHALL load tolerantly as the initial state with no crash and no version bump. An explicit close SHALL purge the persisted state and tombstone the record, so reopening the same chat identifier restarts from the initial state. `rev` is internal bookkeeping and SHALL never be serialized into a response. Persistence SHALL key the ledger by the targeted `machineId`, not by a session pin.

#### Scenario: Required cycle is spawn then emit

- **WHEN** a fresh sidecar process spawns for a chat whose session file holds a persisted machine state written by a matching sidecar version
- **THEN** the first `/emit` request continues from the persisted stage with no prior `/restore` call, and the replay rules of the idempotency contract hold across the process restart

#### Scenario: Legacy record loads tolerantly

- **WHEN** the session file holds a record without `stateByMachine` (a legacy or pre-change record)
- **THEN** the sidecar loads it without crashing and the machine seeds from its initial state

#### Scenario: Atomic write leaves no temp files

- **WHEN** the sidecar persists a machine outcome to its session file
- **THEN** the write completes through a temp file plus rename and only the session file itself remains in the store directory

#### Scenario: Close purges the persisted state

- **WHEN** the caller closes the session explicitly and later reopens the same chat identifier
- **THEN** the persisted state has been purged and the tombstone recorded, and the reopened session starts from the initial state

### Requirement: Minimal wire outcomes
The `/emit` route SHALL return minimal wire outcomes — `{stage, next, rejected?, warnings?}` on `/emit` — and SHALL NOT serialize the full state object or any snapshot onto the wire; the machine's internal snapshot remains available to projection but never travels in a response. The agent side carries no state JSON and never sends state in a request. There SHALL be no `/restore` route: `bin/sai-state.js` implements only `spawn`, `emit`, `reset`, and `close`, and a restore probe MUST NOT be documented as available. An omitted `machineId` SHALL return `INVALID_EVENT`. A mistyped unknown id SHALL return `UNKNOWN_MACHINE`.

#### Scenario: Emit response carries no state and no snapshot
- **WHEN** the caller emits a stage event that advances, records, or rejects
- **THEN** the response carries only `stage`, `next`, and the optional `rejected` and `warnings` attributes, and no state object and no snapshot appear in the response

#### Scenario: Restore is a body-less read-only probe
- **WHEN** the caller looks for a `/restore` probe with machineId `explore-idea@1` on a chat with a persisted machine
- **THEN** no `/restore` verb exists and the probe MUST NOT be documented as available; state continues only via `spawn` then `emit`

#### Scenario: Probe before any emit returns the closed error
- **WHEN** the caller looks for a `/restore` probe with machineId `explore-idea@1` on a chat with no persisted machine
- **THEN** no `/restore` verb exists and no initial probe is documented; state starts only via `spawn` then `emit`

#### Scenario: Probe without machineId returns INVALID_EVENT
- **WHEN** the caller emits without `machineId`
- **THEN** the response is the closed-vocabulary `INVALID_EVENT` error with no state, snapshot, or stage fields

### Requirement: Cross-process idempotency across restarts
The sidecar SHALL persist a minimal per-machine ledger (`rev`, `lastEventId`, `lastOutcome`) in the session file without enforcing replay: the persisted ledger exists for observability, but `bin/sai-state.js` does not compare the incoming `eventId` against `lastEventId`, so the same `eventId` MUST NOT be specified as replaying the stored outcome without re-applying the transition.

#### Scenario: Same eventId after restart replays without re-applying
- **WHEN** the sidecar process restarts after persisting a machine outcome and the caller re-emits the same `eventId`
- **THEN** the specification guarantees no double-apply promise beyond what the code implements; the ledger is persisted for observability only, and the same `eventId` MUST NOT be specified as replaying the stored outcome without re-applying

### Requirement: Session-file degradation warnings

The sidecar SHALL distinguish an absent session file (legal fresh-chat semantics) from a present-but-corrupt or truncated file: absence SHALL seed or continue from the live in-memory state with no warning, while a corrupt file SHALL be treated as absent (initial seed) and notified through a closed optional `warnings` response attribute (a string array, absent when there are no warnings, first value `SESSION_FILE_CORRUPT`) piggybacked on the same `/emit` or `/restore` response the agent already receives, with no extra turns or calls. Once the store is rewritten by a successful persistence, later responses SHALL carry no warning.

#### Scenario: Corrupt file warns in-band and heals

- **WHEN** the session file is corrupt or truncated and the next `/emit` or `/restore` request arrives
- **THEN** that response carries `warnings` with the value `SESSION_FILE_CORRUPT` and the machine seeds from its initial state, and later responses after the store is rewritten carry no warning

#### Scenario: Absent file is legal and silent

- **WHEN** the session file is absent (swept, cleaned, or a fresh chat) while the sidecar process is live
- **THEN** the next emit seeds or continues from the in-memory state with no warning and rewrites the store

### Requirement: Explore-idea intent allowlist

The explore-idea machine SHALL advance only on the exact next-step intent signal and SHALL reject any other, missing, or empty intent in-band with rejected READINESS_IS_NOT_INTENT and unchanged stage state. RecordedList recording without advancement and empty-list auto-advance on a later no-intent emit SHALL remain unchanged.

In addition, the machine SHALL accept exactly two conditional-stage entry intents for the `poc-lane` stage: `poc-lane`, valid only at the `explore-change` stage, and `poc-lane-late`, valid only at the `review-edge-cases`, `implementation-details`, and `crystallize` stages. Each entry intent SHALL declare the set of stages it is valid at, and an entry intent emitted at a stage in its own set SHALL move the progression into the `poc-lane` stage without recording or altering any list and without a rejection, with the returned `next.follow` naming the conditional stage's step file. An entry intent emitted at any stage outside its own set SHALL be rejected with READINESS_IS_NOT_INTENT and an unchanged stage. The retired `crystallize-resume` intent SHALL have no special handling and SHALL be treated as an unknown intent at every stage.

#### Scenario: Stray intent does not advance

- **WHEN** the caller emits banana, missing, or empty intent at explore-change without a recorded empty list condition
- **THEN** the machine returns the current stage with READINESS_IS_NOT_INTENT and does not advance

#### Scenario: Exact next-step advances one stage

- **WHEN** the caller emits the exact next-step intent
- **THEN** the machine advances exactly one stage per emit, skipping every conditional stage, through review-edge-cases and implementation-details to crystallize

#### Scenario: Recorded lists preserve existing semantics

- **WHEN** the caller emits recordedList with a non-empty or empty list, followed where applicable by a later no-intent emit
- **THEN** recording alone does not advance and a recorded empty list at a list stage auto-advances only on the later no-intent emit

#### Scenario: A lane intent routes without advancing

- **WHEN** the caller emits `poc-lane` at the explore-change stage
- **THEN** the machine sets no lane route and instead enters the conditional `poc-lane` stage, recording no list and returning no rejection, with `next.follow` naming `sai/commands/explore/steps/poc-lane.md`

#### Scenario: A lane intent outside its stage is rejected

- **WHEN** the caller emits `poc-lane` at review-edge-cases, implementation-details, or crystallize, or emits `poc-lane-late` at explore-change or at the poc-lane stage itself
- **THEN** the machine returns READINESS_IS_NOT_INTENT with an unchanged stage and `pocLane` unchanged

#### Scenario: The late entry intent routes from stages 2 through 4

- **WHEN** the caller emits `poc-lane-late` at review-edge-cases, implementation-details, or crystallize
- **THEN** the machine enters the conditional `poc-lane` stage from that stage with no rejection, records no list, and returns `sai/commands/explore/steps/poc-lane.md` as `next.follow`

#### Scenario: The retired resume intent is an unknown intent

- **WHEN** the caller emits `crystallize-resume` at the crystallize stage
- **THEN** the machine returns READINESS_IS_NOT_INTENT with an unchanged stage and the crystallize stage's own step file as `next.follow`

### Requirement: The POC lane is a conditional stage of explore-idea

The `explore-idea` machine SHALL carry `poc-lane` as a conditional stage positioned between `explore-change` and `review-edge-cases`, declared in a dedicated conditional-stage list. Ordinary advancement SHALL step over every conditional stage, so a `next-step` intent at `explore-change` SHALL land on `review-edge-cases`, and the conditional stage SHALL be reachable only through one of its declared entry intents: `poc-lane` from `explore-change`, or `poc-lane-late` from `review-edge-cases`, `implementation-details`, or `crystallize`. Entering through either intent SHALL leave every recorded list untouched, so an already agreed edge-case or implementation-detail list survives a late entry. The `poc-lane` stage SHALL own a `candidateList` in state, recorded by a `recordedList` event without advancing the stage and distinguishing unrecorded (`null`) from recorded-empty (an empty array); a recorded empty candidate list SHALL NOT auto-advance the lane on a later no-intent emit. Entering the stage SHALL set a persisted boolean `pocLane` that SHALL survive leaving the stage, so the caller can keep the conditional panel entry painted for the rest of the progression. Leaving the lane SHALL use the ordinary `next-step` advancement into `review-edge-cases`, whichever stage the lane was entered from. The stage's step pointer SHALL be `sai/commands/explore/steps/poc-lane.md` with a stage-static `load and follow` hint, and SHALL be derived from the persisted stage by `project` and by every `transition` outcome, including a non-advancing rejected emit.

#### Scenario: ordinary advancement skips the conditional stage

- **WHEN** the caller emits `next-step` at `explore-change`
- **THEN** the machine advances to `review-edge-cases` and `pocLane` stays false

#### Scenario: the entry intent enters the conditional stage

- **WHEN** the caller emits the `poc-lane` intent at `explore-change`
- **THEN** the stage becomes `poc-lane`, `pocLane` becomes true, no list is recorded, and `next.follow` is `sai/commands/explore/steps/poc-lane.md`

#### Scenario: the late entry intent enters the same stage from a later stage

- **WHEN** the caller emits the `poc-lane-late` intent at `review-edge-cases`, `implementation-details`, or `crystallize` with an edge-case or implementation-detail list already recorded
- **THEN** the stage becomes `poc-lane`, `pocLane` becomes true, `candidateList` stays unrecorded, and every already recorded list is returned unchanged

#### Scenario: the candidate list records without advancing

- **WHEN** the caller emits a `recordedList` event at the `poc-lane` stage
- **THEN** the supplied list records into `candidateList` and the stage stays `poc-lane`

#### Scenario: a recorded empty candidate list never auto-advances

- **WHEN** an empty `recordedList` is emitted at `poc-lane` and a later emit carries no valid intent
- **THEN** the stage stays `poc-lane` and the emit is rejected with READINESS_IS_NOT_INTENT

#### Scenario: the conditional entry survives the stage it belongs to

- **WHEN** the caller emits `next-step` at `poc-lane`
- **THEN** the stage becomes `review-edge-cases` and `pocLane` remains true

#### Scenario: a late lane run returns to stage 2 with its lists intact

- **WHEN** the caller emits `next-step` at `poc-lane` after entering it with `poc-lane-late` from `implementation-details` or `crystallize`
- **THEN** the stage becomes `review-edge-cases`, `pocLane` remains true, and the previously recorded edge-case and implementation-detail lists are returned unchanged
