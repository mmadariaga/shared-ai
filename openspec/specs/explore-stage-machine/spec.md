# explore-stage-machine Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.

## Requirements

### Requirement: Deterministic stage transitions

The `explore-idea` machine SHALL advance stages only on explicit caller-supplied intent signals plus the deterministic content-based empty-set rule, and SHALL never advance on model readiness judgment. The content-based rule is: at the `review-edge-cases` stage, when the recorded edge-case list is empty, the machine advances without requiring intent. At the `implementation-details` stage a recorded empty implementation-details list SHALL NOT advance without intent; it advances only on the `next-step` intent, which carries the user's confirmation of the proposed `- None`. The rule fires only on its own stage's recorded list; all other stage transitions require explicit intent. To distinguish recorded empty from unrecorded, the state carries `edgeCaseList` and `implementationDetailsList` as null when unrecorded and as an array (including empty array) when recorded. The machine SHALL consume a `recordedList` event: a non-null `recordedList` records the supplied list into the current stage's own list (`ideaList` at `explore-change`, `edgeCaseList` at `review-edge-cases`, `implementationDetailsList` at `implementation-details`) without advancing the stage; recording and advancing remain separate emits, a recorded empty edge-case list advances only on a later no-intent emit per the content-based empty-set rule, and a recorded empty implementation-details list advances only on a later `next-step` emit. The explore command (the primary caller) retains intent recognition, dominant-intent classification, and list-agreement semantics on the caller side. The machine id SHALL be `explore-idea@1`. Emit of retired `explore-stage@1` SHALL be `UNKNOWN_MACHINE` with no alias.

#### Scenario: Intent advances, readiness does not

- **WHEN** the caller emits a stage event without an explicit intent signal and the stage is not `review-edge-cases` with a recorded empty edge-case list
- **THEN** the machine rejects the advance and returns the current state's pointer instead of moving to the next stage

#### Scenario: Empty list auto-advances deterministically

- **WHEN** the caller emits the stage event against the `review-edge-cases` stage where the recorded edge-case list is empty and no explicit intent signal
- **THEN** the machine advances without requiring an intent signal and returns the next stage's pointer

#### Scenario: Empty implementation-details list advances only on next-step

- **WHEN** the implementation-details list is recorded empty at `implementation-details` and the caller emits a stage event with no intent or with an empty intent
- **THEN** the machine stays at `implementation-details` with `rejected: READINESS_IS_NOT_INTENT`, and a later `next-step` emit advances to `crystallize` keeping the empty list

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
- **THEN** the list records as recorded-empty and the stage stays until a later no-intent emit at `review-edge-cases`, or a later `next-step` emit at `implementation-details`

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
- **THEN** the response carries only the minimal wire outcome (`stage`, `next`, the identifier-only `run` view with its `moves`, and the optional `rejected`, `missing`, `resume_at`, and `warnings` attributes) while the caller alone updates the idea list, owns closure, and runs any review loop

### Requirement: Stage-machine PoC scope

The machine SHALL absorb the explore stage-progression rules into its transition table and SHALL leave the `Result Loop`, chat `Closure State` ownership, and intent classifiers outside the PoC.

#### Scenario: Absorbed rules transition, excluded surfaces stay out

- **WHEN** an emission exercises a stage-progression rule versus a `Result Loop` or intent-classifier behavior
- **THEN** the machine deterministically decides the former and rejects or ignores the latter as out of scope with the current state's pointer

### Requirement: Single-level emit outcome
The `/emit` route of the `explore-idea` sidecar SHALL return exactly one level of minimal wire outcome, `{stage, next, run, rejected?, missing?, resume_at?, warnings?}`. `stage` is the current stage string, `next` is the current pointer, `run` is the identifier-only view `{moves}` of the accepted `goto` moves, `rejected` is the optional in-band rejection marker, `missing` and `resume_at` are present only on a `goto` rejected with `MISSING_PRECONDITIONS`, and `warnings` is the optional degradation-warning channel. The route SHALL store the plain machine state as session state and SHALL NOT re-wrap `transition()`'s return into a nested envelope or serialize any other state object into the response. A no-intent emit that triggers neither recording nor a content-based empty-set rule SHALL return the current stage in-band with the rejection marker `rejected: READINESS_IS_NOT_INTENT` instead of advancing. The implementation SHALL NOT claim eventId replay: `bin/sai-state.js` persists with a fixed empty eventId and never compares `lastEventId`, so a replayed `eventId` MUST NOT be described as returning the stored outcome without re-applying.

#### Scenario: Single-level envelope and monotonic stage walk
- **WHEN** the caller emits a stage event by piping the event JSON to `emit <id> explore-idea@1 -` across consecutive turns with no `goto`
- **THEN** every response carries exactly the minimal `stage`, `next`, and `run` keys, plus the optional `rejected` and `warnings` attributes, with `stage` a plain string. Consecutive emits walk `explore-change` to `review-edge-cases` to `implementation-details` to `crystallize` without resetting, and the specification makes no idempotent-replay guarantee.

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
The `/emit` route SHALL return minimal wire outcomes — `{stage, next, run, rejected?, missing?, resume_at?, warnings?}` on `/emit`, where `run` is the identifier-only view `{moves}` and `missing` and `resume_at` appear only on a `goto` rejected with `MISSING_PRECONDITIONS` — and SHALL NOT serialize the full state object or any snapshot onto the wire; the machine's internal snapshot remains available to projection but never travels in a response. The agent side carries no state JSON and never sends state in a request. There SHALL be no `/restore` route: `bin/sai-state.js` implements only `spawn`, `emit`, `reset`, and `close`, and a restore probe MUST NOT be documented as available. An omitted `machineId` SHALL return `INVALID_EVENT`. A mistyped unknown id SHALL return `UNKNOWN_MACHINE`.

#### Scenario: Emit response carries no state and no snapshot
- **WHEN** the caller emits a stage event that advances, records, or rejects
- **THEN** the response carries only `stage`, `next`, `run`, and the optional `rejected`, `missing`, `resume_at`, and `warnings` attributes, and no state object and no snapshot appear in the response

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

The sidecar SHALL distinguish an absent session file (legal fresh-chat semantics) from a present-but-corrupt or truncated file: absence SHALL seed or continue from the live in-memory state with no warning, while a corrupt file SHALL be renamed aside to `<session-file>.corrupt` (with a numeric suffix when that name is taken, so an earlier copy survives), treated as absent (initial seed), and notified through a closed optional `warnings` response attribute (a string array, absent when there are no warnings, first value `SESSION_FILE_CORRUPT`) together with the preserved path in `corrupt_file`, piggybacked on the same `/emit` or `/restore` response the agent already receives, with no extra turns or calls. A corrupt file SHALL never be overwritten. Once the store is rewritten by a successful persistence, later responses SHALL carry no warning.

#### Scenario: Corrupt file warns in-band and heals

- **WHEN** the session file is corrupt or truncated and the next `/emit` or `/restore` request arrives
- **THEN** that response carries `warnings` with the value `SESSION_FILE_CORRUPT` and the preserved path in `corrupt_file`, the corrupt bytes survive at that path, the machine seeds from its initial state, and later responses after the store is rewritten carry no warning

#### Scenario: Absent file is legal and silent

- **WHEN** the session file is absent (swept, cleaned, or a fresh chat) while the sidecar process is live
- **THEN** the next emit seeds or continues from the in-memory state with no warning and rewrites the store

### Requirement: Explore-idea intent allowlist

The explore-idea machine SHALL advance only on the exact next-step intent signal and SHALL reject any other, missing, or empty intent in-band with rejected READINESS_IS_NOT_INTENT and unchanged stage state. RecordedList recording without advancement and the empty edge-case list auto-advance on a later no-intent emit SHALL remain unchanged.

The recorded empty edge-case list auto-advance SHALL be advancement by content, not by intent: it SHALL apply only to an intent-less emit at `review-edge-cases`, whose `intent` field is absent, null, or the empty string. A signal carrying any other intent SHALL NOT take the auto-advance path at a stage with a recorded empty list and SHALL instead be evaluated by the intent allowlist, so an unrecognized intent or a conditional-entry intent emitted outside its own valid stage set SHALL be rejected with READINESS_IS_NOT_INTENT and an unchanged stage. The conditional-stage entry check SHALL continue to be evaluated before the auto-advance.

In addition, the machine SHALL accept exactly two conditional-stage entry intents for the `poc-lane` stage: `poc-lane`, valid only at the `explore-change` stage, and `poc-lane-late`, valid only at the `review-edge-cases`, `implementation-details`, and `crystallize` stages. Each entry intent SHALL declare the set of stages it is valid at, and an entry intent emitted at a stage in its own set SHALL move the progression into the `poc-lane` stage without recording or altering any list and without a rejection, with the returned `next.follow` naming the conditional stage's step file. An entry intent emitted at any stage outside its own set SHALL be rejected with READINESS_IS_NOT_INTENT and an unchanged stage. The retired `crystallize-resume` intent SHALL have no special handling and SHALL be treated as an unknown intent at every stage.

The machine SHALL also accept the `goto` intent (see the goto requirement) and the section-recording event. It SHALL also accept the `pause`, `resume`, `close-explore`, and `status` intents, which act on the exploration rather than on its stage (see the requirement on the exploration's pause and close) and are evaluated before every stage event. The retired `issue-shortcut` intent SHALL have no special handling and SHALL be treated as an unknown intent at every stage. An issue reaches `crystallize` directly from `explore-change` only when its sections were recorded `agreed` with the source `issue` and a `goto` to `crystallize` passes the preconditions; an implementation-details section the issue states as none SHALL be recorded as an agreed empty list.

#### Scenario: Stray intent does not advance

- **WHEN** the caller emits banana, missing, or empty intent at explore-change without a recorded empty list condition
- **THEN** the machine returns the current stage with READINESS_IS_NOT_INTENT and does not advance

#### Scenario: An empty recorded list does not excuse an unrecognized intent

- **WHEN** the caller emits `banana`, `crystallize-resume`, or an out-of-stage `poc-lane` at `review-edge-cases` with an empty recorded edge-case list, or at `implementation-details` with an empty recorded implementation-details list
- **THEN** the machine returns READINESS_IS_NOT_INTENT with an unchanged stage and `pocLane` unchanged, and does not advance

#### Scenario: Exact next-step advances one stage

- **WHEN** the caller emits the exact next-step intent with no later section recorded `agreed`
- **THEN** the machine advances exactly one stage per emit, skipping every conditional stage, through review-edge-cases and implementation-details to crystallize

#### Scenario: Recorded lists preserve existing semantics

- **WHEN** the caller emits recordedList with a non-empty or empty list, followed where applicable by a later emit
- **THEN** recording alone does not advance, a recorded empty edge-case list auto-advances only on the later no-intent emit, and a recorded empty implementation-details list advances only on a later `next-step` emit

#### Scenario: A lane intent routes without advancing

- **WHEN** the caller emits `poc-lane` at the explore-change stage
- **THEN** the machine sets no lane route and instead enters the conditional `poc-lane` stage, recording no list and returning no rejection, with `next.follow` naming `sai/commands/explore/steps/poc-lane.md`

#### Scenario: A lane intent outside its stage is rejected

- **WHEN** the caller emits `poc-lane` at review-edge-cases, implementation-details, or crystallize, or emits `poc-lane-late` at explore-change or at the poc-lane stage itself
- **THEN** the machine returns READINESS_IS_NOT_INTENT with an unchanged stage and `pocLane` unchanged

#### Scenario: The late entry intent routes from stages 2 through 4

- **WHEN** the caller emits `poc-lane-late` at review-edge-cases, implementation-details, or crystallize, including from a stage whose own list was recorded empty
- **THEN** the machine enters the conditional `poc-lane` stage from that stage with no rejection, records no list, and returns `sai/commands/explore/steps/poc-lane.md` as `next.follow`

#### Scenario: The retired resume intent is an unknown intent

- **WHEN** the caller emits `crystallize-resume` at the crystallize stage
- **THEN** the machine returns READINESS_IS_NOT_INTENT with an unchanged stage and the crystallize stage's own step file as `next.follow`

#### Scenario: The issue shortcut moves explore-change to crystallize

- **WHEN** every section was recorded `agreed` with the source `issue` and the caller emits `goto` with target `crystallize` at explore-change
- **THEN** the machine moves to crystallize and returns `sai/commands/explore/steps/crystallization-protocol.md` as `next.follow`

#### Scenario: The issue shortcut accepts an empty implementation list

- **WHEN** the issue's implementation-details section was recorded `agreed` with an empty list and every other section is `agreed`, and the caller emits `goto` with target `crystallize`
- **THEN** the machine keeps the empty implementation list as agreed and moves to crystallize with no rejection

#### Scenario: The issue shortcut is rejected outside explore-change or with malformed lists

- **WHEN** the caller emits the retired `issue-shortcut` intent at any stage, or a section-recording event whose list holds a non-identifier entry
- **THEN** the machine returns READINESS_IS_NOT_INTENT or SECTIONS_INVALID respectively, with an unchanged state

#### Scenario: Exploration intents are not stage intents

- **WHEN** the caller emits `pause`, `resume`, `close-explore`, or `status` at any stage
- **THEN** the machine evaluates it as an exploration intent and does not answer READINESS_IS_NOT_INTENT

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

### Requirement: Explore spawns its session at the end of the load

`/sai-explore` SHALL run `sai-state spawn --key <stable-key>` per `@sai/policies/stage-machine.md` as the final step of its load, after the instruction loads and before the `## Run` section of `sai/commands/explore/body.md`, and SHALL retain the returned `id` as the load receipt's session id. The spawn SHALL run on every explore load, including loads that never reach a stage event.

#### Scenario: Spawn closes the load

- **WHEN** `/sai-explore` is invoked and the prerequisite check passes
- **THEN** the instruction loads complete, `sai-state spawn` runs as the last load step, and its returned id is kept as the receipt's session id before the user's request is handled

### Requirement: Stage events emit on the load receipt id

Every explore stage-event turn (a user intent that advances the progression, or a recorded list at an agreement gate) SHALL emit against the owning machine (`explore-idea@1` or `explore-slice@1`) on the receipt id from the load and SHALL open no session of its own. `sai/commands/explore/instructions.md` § Stage machines SHALL NOT prescribe a per-turn spawn-then-emit cycle.

#### Scenario: Stage event reuses the receipt id

- **WHEN** a stage-event turn emits to `explore-idea@1` or `explore-slice@1` after the load
- **THEN** the emit targets the session id retained from the load's `sai-state spawn` and no new spawn runs for that turn

### Requirement: Explore-idea records each section's state and source

`explore-idea@1` SHALL store, for each of the sections `explore-change`, `review-edge-cases`, and `implementation-details`, a state `agreed` or `open` and a source `issue` or `conversation`, next to the identifier lists; free text SHALL NOT enter the store. Every section SHALL start `open` with no source. The event `{"sections": {"<stage>": {"state", "source"?, "list"?}}}` SHALL record each named section without moving the stage; `list` SHALL hold identifiers only and SHALL become that stage's starting list, and an `agreed` section SHALL need a source. An invalid event SHALL answer `rejected: "SECTIONS_INVALID"` and change nothing. `next-step` SHALL record the section of the stage it closes as `agreed` with the source `conversation` when it is not already agreed, and SHALL skip every later stage whose section is still `agreed`, except when the progression leaves the POC lane. Recording a list that differs from the stored one SHALL reopen its own section, and a changed `explore-change` list SHALL reopen every later section while keeping its list as the starting proposal.

#### Scenario: Seeding records sections without moving the stage

- **WHEN** the caller emits a sections event marking `review-edge-cases` `agreed` with the source `issue` and the list `E1`, `E2`
- **THEN** the section and its list are recorded and the stage stays where it was

#### Scenario: Malformed sections event changes nothing

- **WHEN** the sections event names an unknown stage, an unknown state, an agreed section without any source, or a list entry that is not an identifier
- **THEN** the machine answers `SECTIONS_INVALID` and the state is unchanged

#### Scenario: next-step skips agreed sections

- **WHEN** the caller emits `next-step` at `explore-change` while the `review-edge-cases` section is `agreed`
- **THEN** the `explore-change` section becomes `agreed` with the source `conversation` and the stage moves to `implementation-details`

#### Scenario: A changed What/Why reopens later sections

- **WHEN** a recorded `explore-change` list differs from the stored one
- **THEN** the `explore-change`, `review-edge-cases`, and `implementation-details` sections become `open` and their lists are kept

### Requirement: Explore-idea goto moves to any stage whose preconditions hold

`explore-idea@1` SHALL accept `goto` with a `target` stage and a required `reason` of `user-request` or `correction`. The machine SHALL declare its per-stage preconditions as data: `review-edge-cases` needs `explore-change` agreed, `implementation-details` needs `explore-change` and `review-edge-cases` agreed, and `crystallize` needs all three sections agreed. A backward move SHALL always be accepted and SHALL keep every section's state. A forward move SHALL stop at `crystallize`, the ceiling; when a precondition does not hold it SHALL answer `rejected: "MISSING_PRECONDITIONS"` with `missing` (each absent section) and `resume_at` (the earliest stage that owns one) and leave the state unchanged. A route start or route step target SHALL answer `GOTO_PAST_CEILING`; an unknown target `GOTO_UNKNOWN_TARGET`; the current stage `GOTO_ALREADY_AT_TARGET`; and a missing or other reason `GOTO_REASON_INVALID`, each with the state unchanged. The CLI SHALL expose `missing` and `resume_at` on the emit response.

#### Scenario: Forward move with every precondition reaches crystallize

- **WHEN** all three sections are `agreed` and the caller emits `goto` to `crystallize` from `explore-change`
- **THEN** the machine moves to `crystallize`

#### Scenario: Forward move with an open section is rejected

- **WHEN** the `review-edge-cases` section is `open` and the caller emits `goto` to `crystallize`
- **THEN** the machine answers `MISSING_PRECONDITIONS` with `missing` naming `review-edge-cases` and `resume_at` `review-edge-cases`, and the stage is unchanged

#### Scenario: Backward move keeps sections

- **WHEN** the caller emits `goto` to `review-edge-cases` from `crystallize`
- **THEN** the move is accepted and every section keeps its state

#### Scenario: Targets past the route selector are rejected

- **WHEN** the caller emits `goto` with a target such as `direct-build`, `plan`, or `build-implement`
- **THEN** the machine answers `GOTO_PAST_CEILING` and the state is unchanged

### Requirement: Accepted explore moves are recorded

`explore-idea@1` and `explore-slice@1` SHALL append every accepted `goto` to a `moves` list in their state as `{target, reason, received_at}`, where `received_at` is the CLI's reception time of the response, and SHALL expose the list as `run.moves` on every response so the closing report can list it. A rejected `goto` SHALL record nothing.

#### Scenario: Accepted move is listed

- **WHEN** a `goto` with reason `correction` is accepted
- **THEN** `run.moves` ends with that target, the reason `correction`, and the response's `received_at`

#### Scenario: Rejected move records nothing

- **WHEN** a `goto` is rejected
- **THEN** `run.moves` is unchanged

### Requirement: Explore-idea records the exploration's pause and close

The explore-idea machine SHALL record the life of the exploration, apart from its stage, as `exploration` with the values `active`, `paused`, and `closed`, and every response SHALL carry it as `run.exploration`. A state stored before the field existed SHALL read as `active`. The `pause` intent SHALL set `paused` and keep every stage, section, list, and move. The `resume` intent SHALL return a paused exploration to `active` at the stage it was paused in, and SHALL answer `rejected: "NOT_PAUSED"` with an unchanged state on an active exploration. The `close-explore` intent SHALL set `closed` and return the stage, sections, lists, and moves to their initial values while the session file stays, so the mark survives a context compaction; only `sai-state reset <id> explore-idea@1` SHALL leave `closed`. The `status` intent SHALL read the exploration and change nothing in any exploration. While `paused`, every intent other than `resume` and `status`, the section and list events included, SHALL answer `rejected: "EXPLORATION_PAUSED"` and change nothing; while `closed`, every intent other than `status` SHALL answer `rejected: "EXPLORATION_CLOSED"`. The `next` pointer of a paused or closed exploration SHALL name the common step and state that no explore step is in force. `sai/policies/stage-machine.md` SHALL document these intents.

#### Scenario: Pause keeps the progression and only resume leaves it

- **WHEN** the caller emits `pause` at review-edge-cases with a recorded edge-case list, then emits `next-step`, `goto`, `poc-lane-late`, a recorded list, a section event, `pause`, or `close-explore`
- **THEN** each later event answers EXPLORATION_PAUSED with an unchanged state, and a `resume` returns the exploration to `active` at review-edge-cases with the same list

#### Scenario: Close leaves the closed mark

- **WHEN** the caller emits `close-explore` at any stage
- **THEN** the exploration is `closed`, the stage and lists are back to their initial values, and every later intent other than `status` answers EXPLORATION_CLOSED

#### Scenario: Resume on an active exploration is rejected

- **WHEN** the caller emits `resume` on an active exploration
- **THEN** the machine answers NOT_PAUSED and the state is unchanged

#### Scenario: The marks survive in the store until a reset

- **WHEN** a paused or closed session is spawned again with the same key and read with `status`
- **THEN** `run.exploration` still reads `paused` or `closed`, and only `sai-state reset <id> explore-idea@1` returns it to an active exploration at explore-change
