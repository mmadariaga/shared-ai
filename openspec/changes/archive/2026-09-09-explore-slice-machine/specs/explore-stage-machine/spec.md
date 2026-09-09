## MODIFIED Requirements

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

### Requirement: Single-level emit outcome

The `/emit` route of the `explore-idea` sidecar SHALL return exactly one level of minimal wire outcome — `{stage, next, rejected?, warnings?}` — where `stage` is the current stage string, `next` is the current pointer, `rejected` is the optional in-band rejection marker, and `warnings` is the optional degradation-warning channel. The route SHALL store the plain machine state as session state (persisted in the sidecar's own session file) and SHALL NOT re-wrap `transition()`'s return into a nested envelope or serialize any state object or snapshot into the response. A no-intent emit that triggers neither recording nor a content-based empty-set rule SHALL return the current stage in-band with the rejection marker `rejected: READINESS_IS_NOT_INTENT` instead of advancing, and a replayed `eventId` SHALL return the identical stored outcome without applying the event twice (in-process via the bounded seen-store, cross-process via the persisted last-event ledger).

#### Scenario: Single-level envelope and monotonic stage walk

- **WHEN** the caller POSTs a `next-step` event to the live `/emit` route with `machineId: "explore-idea@1"` and repeats it across consecutive turns
- **THEN** every response carries exactly the minimal `stage` and `next` keys (plus the optional `rejected` and `warnings` attributes) with `stage` a plain string, and consecutive emits walk `explore-change` → `review-edge-cases` → `implementation-details` → `crystallize` without resetting to an earlier stage

#### Scenario: No-intent emit rejects in-band

- **WHEN** the caller emits a stage event with no explicit intent where neither recording nor an empty-set rule applies
- **THEN** the response carries the `rejected: READINESS_IS_NOT_INTENT` marker and returns the current stage without advancing

#### Scenario: Replayed eventId returns the identical outcome

- **WHEN** the same `eventId` is emitted twice
- **THEN** the second response returns the identical stored outcome and the stage does not advance twice

#### Scenario: Restore returns the carried snapshot state

- **WHEN** the caller POSTs to `/restore` with `machineId: "explore-idea@1"` on a chat with a persisted machine
- **THEN** the probe returns the sidecar-owned current `{stage, next}` with no snapshot state (no snapshot is carried, returned, or required)

### Requirement: HTTP seam live test coverage

The `explore-idea` HTTP seam SHALL have test coverage exercised against the live sidecar server covering consecutive stage advances, list recording, empty-set auto-advance, idempotent replay, no-intent rejection, sidecar-owned store persistence (the record shape with `createdAt` and the per-machine ledger), atomic session-file writes, corruption warnings, cross-process restart replay, and `/close` purge semantics. The suite SHALL also cover same-chat `explore-slice@1` emit after `explore-idea@1`, omitted and mistyped `machineId` errors, and restore that requires `machineId`. The machine and sidecar code SHALL stay stdlib-only with no OS-conditional paths, and the suite SHALL run on Windows and Linux.

#### Scenario: Live seam suite runs identically on both platforms

- **WHEN** the sidecar test suite runs on Windows or Linux
- **THEN** the live-server seam tests pass with `spawn` → `emit` → `restore` → `close` behaving identically on both platforms and no OS-conditional code paths

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

The `/emit` and `/restore` routes SHALL return minimal wire outcomes — `{stage, next, rejected?, warnings?}` on `/emit` and `{stage, next, warnings?}` on `/restore` — and SHALL NOT serialize the full state object or any snapshot onto the wire in either direction; the machine's internal snapshot remains available to projection but never travels in a response. The agent side carries no state JSON and never sends state in a request. A `/restore` request SHALL require `machineId` and SHALL be strictly read-only (it never mutates the session). An omitted `machineId` SHALL return `INVALID_EVENT`. A mistyped unknown id SHALL return `UNKNOWN_MACHINE`. A named restore of a registered machine before any emit SHALL return that machine's initial `{stage, next}`. Nothing SHALL fall back to the first persisted machine. The caller-side agent MAY hold at most one disposable presentation hint (the last rendered stage) for panel rendering on event-less turns and to notice regressions; the sidecar response SHALL always win over the hint.

#### Scenario: Emit response carries no state and no snapshot

- **WHEN** the caller emits a stage event that advances, records, or rejects
- **THEN** the response carries only `stage`, `next`, and the optional `rejected` and `warnings` attributes, and no state object and no snapshot appear in the response

#### Scenario: Restore is a body-less read-only probe

- **WHEN** the caller POSTs to `/restore` with `machineId: "explore-idea@1"` on a chat with a persisted machine
- **THEN** the probe returns the sidecar-owned current `{stage, next}` without mutating the session, and a later `/emit` continues from the current stage instead of resetting

#### Scenario: Probe before any emit returns the closed error

- **WHEN** the caller POSTs to `/restore` with `machineId: "explore-idea@1"` on a chat with no persisted machine
- **THEN** the probe returns that machine's initial `{stage, next}` with no state or snapshot fields

#### Scenario: Probe without machineId returns INVALID_EVENT

- **WHEN** the caller POSTs to `/restore` with no `machineId`
- **THEN** the response is the closed-vocabulary `INVALID_EVENT` error with no state, snapshot, or stage fields
