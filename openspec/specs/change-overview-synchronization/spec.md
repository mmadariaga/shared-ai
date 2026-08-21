# change-overview-synchronization Specification

## Purpose

Persist and transition the change's `overview.state` key in `openspec/changes/{name}/.openspec.yaml`, and define exactly when the overview is generated, regenerated, marked stale, or marked failed across the sai-2 design lifecycle, including first materialization at `Continue`, post-materialization regeneration, reopened-run failure semantics, and the supported modification surfaces.
## Requirements
### Requirement: Persisted materialization state

The change's overview state SHALL continue to use the existing durable `overview.state` key in `openspec/changes/{name}/.openspec.yaml`, with exactly one of `unmaterialized`, `materializing`, `failed`, `current`, or `stale`. An absent key SHALL be interpreted as `unmaterialized` for non-backfilled changes. The design worker SHALL own the existing two-phase transitions whenever an explicit `--overview-lang <language>` opt-in starts generation: `materializing` before dispatch, `current` only after success, `failed` for failed first materialization, and `stale` for failed regeneration or conservative source changes. Backfilled changes SHALL carry no overview state key.

An invocation without `--overview-lang` SHALL not start a generation attempt, create `materializing`, `failed`, or `current` solely because the feedback gate reached Continue, or clear an existing diagnostic solely because generation was skipped. It MAY leave an existing overview and its existing state untouched, including a `stale` state. If source edits make an existing overview no longer current, the run SHALL not falsely report it as newly current; the existing conservative stale semantics remain available. The read-only review loop SHALL not write the key.

#### Scenario: state key transitions unmaterialized → materializing → current at first Continue
- **WHEN** the feedback gate's `Continue` action is processed
- **THEN** the design worker sets `overview.state: materializing` immediately before dispatching the generator
- **AND** after the generator reports success, the design worker commits `overview.state: current`

#### Scenario: two-phase first materialization is recoverable
- **WHEN** the process is lost after the generator wrote `change-overview.md` but before the `current` commit
- **THEN** `overview.state` remains `materializing`
- **AND** the next writable design-worker reconciliation transaction verifies the file against the current sources and commits `current` if consistent, or marks `failed` / regenerates otherwise

#### Scenario: review validation reports but never reconciles
- **WHEN** a review transaction encounters an interrupted `materializing` state
- **THEN** the read-only transaction reports the availability/integrity state
- **AND** it does not write `overview.state` or commit `current`

#### Scenario: failed first materialization sets the failed state
- **WHEN** a first-materialization dispatch returns a failed result per the generator result contract
- **THEN** the design worker writes `overview.state: failed`
- **AND** no valid `change-overview.md` exists

#### Scenario: effective source modification marks stale before the first write
- **WHEN** an integrated surface begins a post-materialization source-modification transaction on a change whose overview is materialized
- **THEN** the design worker sets `overview.state: stale` before the first effective source-artifact write
- **AND** a successful regeneration sets it back to `current`

#### Scenario: abandoned transaction leaves the conservative stale state
- **WHEN** a post-materialization source-modification transaction writes source artifacts and the session is then lost without successful regeneration
- **THEN** `overview.state` remains `stale`
- **AND** no regeneration is performed

#### Scenario: backfilled change carries no state key
- **WHEN** a change with `backfilled: true` is inspected
- **THEN** no `overview.state` key is present
- **AND** the overview is treated as not applicable rather than stale

#### Scenario: Opted-in first materialization keeps the two-phase transition

- **WHEN** the feedback gate's `Continue` action is processed for an invocation with `--overview-lang spanish`
- **THEN** the design worker sets `overview.state: materializing` immediately before dispatching the generator
- **AND** after generator success it commits `overview.state: current`

#### Scenario: Unopted-in initial Continue does not materialize

- **WHEN** the feedback gate's `Continue` action is processed for an invocation without `--overview-lang`
- **THEN** no generator dispatch occurs and no `overview.state` key is created solely by that action
- **AND** an absent state remains interpreted as `unmaterialized`

#### Scenario: Existing stale state may remain stale

- **WHEN** an unopted-in source-modifying design run operates on a change whose overview is already stale
- **THEN** the run does not regenerate it or mark it current
- **AND** the stale overview and state may remain for the existing archive/status consumers

### Requirement: Deferred materialization after the initial feedback loop closes

The overview SHALL NOT be generated during the initial sai-2 feedback loop while source artifacts are converging. For an invocation with explicit `--overview-lang <language>`, first materialization SHALL occur at exactly one successful lifecycle event: processing the feedback gate's `Continue` action after `design.md`, `tasks.md`, and `interfaces.md` verify successfully. A run with the flag that ends by cancellation, worker failure, chat abandonment, or any exit other than `Continue` SHALL not materialize an overview.

For an invocation without the flag, `Continue` SHALL close design without materialization, regardless of whether the change has no overview, an existing overview, or a prior failure/stale state. It SHALL not retry first materialization, dispatch a generator, or create a new failure diagnostic for the skipped operation. Existing overview files and states may remain as they are, including stale. When opted-in generation fails, the existing failure-state, diagnostic, changed-file, and completion-suppression rules remain unchanged.

#### Scenario: failed first materialization writes a diagnostic failure record
- **WHEN** first materialization runs and the generator returns a failed envelope after executing
- **THEN** the generator atomically writes an explicit failure record to `change-overview.md` carrying `failure_kind` and non-empty `failure_details`
- **AND** the design worker sets `overview.state: failed` and suppresses the success terminal

#### Scenario: failed first materialization by dispatch failure preserves the file
- **WHEN** first materialization fails because the generator cannot be dispatched and never runs
- **THEN** the parent persists `overview.failure_kind: dispatch-failed` and non-empty `overview.failure_details`, sets `overview.state: failed`, and leaves any prior overview unmodified
- **AND** the parent reports the dispatch failure and does not present the prior file as current

#### Scenario: malformed first materialization reports a potentially affected overview path
- **WHEN** first materialization returns a malformed or empty envelope after the generator may have written `change-overview.md`
- **THEN** the parent reports `change-overview.md` as potentially affected and persists `overview.failure_kind: generation-error` with non-empty `overview.failure_details`
- **AND** the parent does not claim that the run changed nothing or present the file as current

#### Scenario: later invocation retries from failed
- **WHEN** a re-invoked design run closes its feedback gate with `Continue` for a change whose state is `failed`
- **THEN** first materialization is retried from the then-current sources
- **AND** a successful retry replaces the failure record with a complete validated overview and commits `overview.state: current`

#### Scenario: Opted-in Continue is the only first-materialization event

- **WHEN** an opted-in run reaches `Continue` after all three source artifacts verify
- **THEN** first materialization is attempted exactly once
- **AND** success commits `overview.state: current`

#### Scenario: Unopted-in Continue leaves an existing overview alone

- **WHEN** an unopted-in run reaches `Continue` after source artifacts verify
- **THEN** no generator or overview-generation continuation is dispatched
- **AND** an existing `change-overview.md` is not deleted, repaired, or regenerated
- **AND** its existing state, including `stale` or `failed`, is not converted to `current` by the skip

#### Scenario: Opted-in first-generation failure retains existing failure semantics

- **WHEN** an opted-in first-materialization dispatch returns a failed result or cannot be trusted
- **THEN** the design worker applies the existing `failed` state and durable diagnostic rules
- **AND** it suppresses the successful design completion sentence

### Requirement: Post-materialization regeneration once per source-modifying request

After an overview has been materialized, a later source-modifying writable design-worker transaction SHALL regenerate it exactly once only when that current invocation explicitly supplies `--overview-lang <language>`. The regeneration remains after all requested edits complete and after successful `Continue`, and uses the current explicit language. The `sai-explore` artifact-review loop remains read-only and is not a regeneration surface.

When the current invocation omits the flag, a source-modifying design-worker transaction SHALL not regenerate the overview or dispatch the generator. It may leave the existing overview stale, and it SHALL not claim that the overview reflects the newly written sources. No new regeneration surface is introduced.

#### Scenario: later source modification triggers exactly one regeneration
- **WHEN** an opted-in re-invoked design or supervised design transaction makes one or more effective source edits
- **THEN** the overview is regenerated exactly once after all edits complete
- **AND** the regenerated overview reflects the final source state and explicit language

#### Scenario: regeneration reflects post-transaction sources
- **WHEN** the overview is regenerated after a source-modifying transaction
- **THEN** every section of the overview is derived from the source artifacts as they stand after the transaction's edits

#### Scenario: review-loop provenance does not add a regeneration surface
- **WHEN** the read-only artifact-review loop hands off accepted findings as provenance
- **THEN** no regeneration is triggered by the review transaction itself
- **AND** exactly one regeneration follows only when a writable design-worker transaction applies the edits

#### Scenario: same-chat request after Continue is not a supported transaction
- **WHEN** a user makes a request in the same chat after the design coordinator has terminated at `Continue`
- **THEN** the request is not a supported post-materialization transaction
- **AND** the user is directed to a re-invoked design invocation for further source modifications

#### Scenario: Opted-in source modification triggers exactly one regeneration

- **WHEN** an opted-in re-invoked `/sai-2-design` or supervised design transaction makes one or more effective source edits
- **THEN** the overview is regenerated exactly once after all edits complete
- **AND** the regenerated overview reflects the final source state and explicit language

#### Scenario: Unopted-in source modification does not regenerate

- **WHEN** a later source-modifying design transaction omits `--overview-lang`
- **THEN** no regeneration is dispatched
- **AND** an existing overview may remain stale without a new overview-generation attempt

### Requirement: No regeneration without effective source changes

A transaction that produces no effective source-artifact changes SHALL NOT regenerate the overview, even when the overview is already materialized. Transactions that touch only non-source artifacts or make no effective edit SHALL leave the existing overview in place, unchanged. "Effective source change" SHALL mean a transaction that creates, deletes, or changes the content of at least one source artifact relative to its pre-transaction state.

#### Scenario: non-modifying transaction leaves overview unchanged
- **WHEN** a post-materialization transaction completes without effectively modifying any source artifact (for example it modifies only `implementation.md`, or makes no edits)
- **THEN** the existing overview is left in place and is not regenerated

#### Scenario: materialization state drives generation decisions
- **WHEN** the pipeline decides whether to generate or regenerate the overview for a change
- **THEN** the decision uses the change's persisted `overview.state` — first materialization for a change with no overview (`unmaterialized`), retry of first materialization after a failed attempt (`failed`), reconciliation of an interrupted dispatch (`materializing`), regeneration for a change that already has one (`current` or `stale`)

### Requirement: Reopened-run failure semantics for a materialized overview

A re-invoked `/sai-2-design` run on a materialized change SHALL retain the existing stale-before-first-write and unsuccessful-exit semantics when it is opted in with `--overview-lang <language>`: source edits mark the overview stale before the first effective write, and successful `Continue` regenerates exactly once and commits `current`. When the flag is absent, the run SHALL not enter an overview-generation attempt. If it writes source artifacts, it SHALL not mark the overview current; the existing overview may remain stale, and no later point is required to regenerate it during that invocation. A run that writes no source artifact leaves the prior state unchanged.

#### Scenario: reopened run marks stale at its first source write
- **WHEN** a re-invoked design run on a materialized change performs its first source-artifact write
- **THEN** the design worker sets `overview.state: stale` immediately before that write
- **AND** no later execution point is required to record the stale state

#### Scenario: reopened run exits unsuccessfully after writing sources
- **WHEN** a re-invoked run has written source artifacts and then exits unsuccessfully
- **THEN** `overview.state` remains `stale` with no further write required
- **AND** no regeneration is performed

#### Scenario: reopened run exits unsuccessfully before its first source write
- **WHEN** a re-invoked run exits unsuccessfully before writing any source artifact
- **THEN** the existing overview is left in place with its prior state
- **AND** the overview is not marked stale

#### Scenario: reopened run succeeds and regenerates at Continue
- **WHEN** a re-invoked run effectively modifies source artifacts and closes with successful `Continue`
- **THEN** the overview is regenerated exactly once from the post-run sources
- **AND** `overview.state` is committed to `current`

#### Scenario: Opted-in reopened run regenerates at Continue

- **WHEN** an opted-in reopened run modifies source artifacts and closes with successful `Continue`
- **THEN** it regenerates exactly once through `materializing` to `current`

#### Scenario: Unopted-in reopened run leaves stale output permitted

- **WHEN** an unopted-in reopened run modifies source artifacts and closes successfully
- **THEN** it performs no regeneration
- **AND** the existing overview may remain stale and is not reported as current because of the run

#### Scenario: Unopted-in unsuccessful run does not start generation

- **WHEN** an unopted-in reopened run is cancelled or fails before or after source writes
- **THEN** no generator dispatch or generation failure record is created for that invocation
- **AND** any existing stale state remains available for later opted-in recovery

### Requirement: Supported post-materialization modification surfaces

The post-materialization regeneration path SHALL remain owned by the existing writable design-worker transactions — a re-invoked `/sai-2-design` and the supervised design phase — but exactly one regeneration is promised only when the transaction's current invocation includes `--overview-lang <language>` and makes effective source changes. Without the flag, those same transactions may modify source artifacts without regeneration and may leave the overview stale. The `sai-explore` artifact-review loop remains a read-only origin of handoff payloads, and no other surface becomes regeneration-integrated.

#### Scenario: re-invoked sai-2-design regenerates at its own Continue
- **WHEN** a re-invoked design run on a materialized change effectively modifies source artifacts
- **THEN** exactly one regeneration occurs when its feedback loop closes with `Continue`
- **AND** the regenerated overview reflects the post-run source state

#### Scenario: re-invoked sai-2-design with no effective changes regenerates nothing
- **WHEN** a re-invoked design run completes without changing source artifact content
- **THEN** the existing overview is left in place and is not regenerated

#### Scenario: design-worker transaction regenerates once after applying review-loop provenance
- **WHEN** a writable design-worker transaction applies handed-off findings and effectively modifies source artifacts
- **THEN** exactly one regeneration occurs after the design-worker edits complete
- **AND** the review transaction itself never writes or regenerates

#### Scenario: supervised design phase regenerates once after machine-feedback edits
- **WHEN** the supervised design phase applies accepted findings that effectively modify source artifacts
- **THEN** exactly one regeneration occurs after the edits complete

#### Scenario: out-of-band source modification is detectable, not auto-regenerated
- **WHEN** unintegrated tooling modifies a source artifact of a materialized change
- **THEN** no automatic regeneration is performed
- **AND** the next review-validation transaction detects the divergence

#### Scenario: Opted-in re-invoked design regenerates

- **WHEN** `/sai-2-design` is re-invoked with `--overview-lang spanish` and effectively modifies source artifacts
- **THEN** exactly one regeneration occurs when its feedback loop closes with `Continue`
- **AND** the regenerated overview uses `spanish`

#### Scenario: Unopted-in re-invoked design does not regenerate

- **WHEN** `/sai-2-design` is re-invoked without `--overview-lang` and effectively modifies source artifacts
- **THEN** no regeneration occurs
- **AND** the existing overview may remain stale

#### Scenario: Review loop remains read-only

- **WHEN** the `sai-explore` artifact-review loop hands off accepted findings as provenance
- **THEN** it does not write, forward, or regenerate an overview itself
- **AND** only a later opted-in writable design-worker transaction may regenerate

### Requirement: Regeneration failure leaves a diagnostic stale overview

When regeneration fails after a source-modifying transaction, the previous overview SHALL NOT be treated as current. For every generator-run failure kind — `blocking-contradiction`, `validation-failed`, and `generation-error` — the generator SHALL atomically replace `change-overview.md` with an explicit stale failure record carrying the exact `failure_kind` and non-empty `failure_details`, including the relevant source, artifact, or generation location. The design worker SHALL persist the same failure classification in `overview.failure_kind` and non-empty diagnostic in `overview.failure_details` in `.openspec.yaml` alongside `overview.state`; the `.openspec.yaml` changed-files obligation is governed by `Parent-owned failure diagnostics have one durable carrier`. A blocking contradiction's details SHALL name both conflicting sources and their locations and state the one-line disagreement; all other failure kinds SHALL identify the failed operation and location instead of falling back to a generic or empty message.

The design worker SHALL set `overview.state: stale`, and the failed run SHALL not modify source artifacts. A dispatch failure or process loss, where the generator never returns a result, SHALL leave the prior file unmodified, persist the parent-authored failure classification and non-empty `failure_details` in `overview.failure_kind` and `overview.failure_details`, and not write a stale record or modify `change-overview.md`. A malformed or empty envelope is an output-contract violation: the parent SHALL author non-empty details naming the violation, location, and offending value or missing field, preserve whatever file state exists, persist `overview.failure_kind: generation-error` and those details in `.openspec.yaml`, and set `overview.state: stale`. No failure record or preserved file SHALL be presented as current. A later successful regeneration SHALL replace diagnostic stale state with a valid overview, clear `overview.failure_kind` and `overview.failure_details`, and commit `overview.state: current`.

#### Scenario: every generator failure kind is persisted in a stale record

- **WHEN** regeneration fails with `blocking-contradiction`, `validation-failed`, or `generation-error` after the generator runs
- **THEN** `change-overview.md` is atomically replaced with a stale failure record carrying that `failure_kind` and non-empty `failure_details`
- **AND** `changed_files` names `change-overview.md`, `overview.state` is `stale`, and the prior overview is not current

#### Scenario: stale contradiction record retains source locations

- **WHEN** regeneration fails because two source artifacts state conflicting facts
- **THEN** the stale record carries `failure_details` naming both conflicting sources and their locations and stating the one-line disagreement

#### Scenario: dispatch and malformed failures retain parent diagnostics

- **WHEN** regeneration fails by dispatch failure, process loss, or malformed/empty envelope
- **THEN** the parent authors non-empty `failure_details` naming what failed and where, and persists the matching `overview.failure_kind` and `overview.failure_details` keys in `.openspec.yaml`
- **AND** dispatch or process loss preserves the prior file while malformed/empty output preserves whatever file state exists
- **AND** the parent sets `overview.state: stale` without writing `change-overview.md`

### Requirement: Parent-owned failure diagnostics have one durable carrier

For every overview-generation failure mapped by the design worker, the worker SHALL persist the exact non-empty English `failure_details` in `overview.failure_details` and the matching closed `failure_kind` in `overview.failure_kind` in `openspec/changes/{change-name}/.openspec.yaml`, alongside `overview.state`. Whenever any of `overview.state`, `overview.failure_kind`, or `overview.failure_details` is written, `.openspec.yaml` SHALL be included in the outer worker `changed_files` union. This includes generator-run failures, dispatch failures, process loss detected by the parent, malformed envelopes, empty envelopes, and failed first materialization. At the start of every new generation attempt, the worker SHALL clear both diagnostic keys: at the `stale-before-first-write` transition for a post-materialization source-modifying run, and immediately before a `materializing` dispatch for first materialization or regeneration. The worker SHALL repopulate the keys only after the current attempt's failure is identified. If the worker is lost after clearing the keys but before the current attempt is classified, a resulting `materializing` state with absent diagnostic keys SHALL mean that the generation attempt was interrupted before failure classification; it SHALL NOT mean that no failure occurred, and no prior attempt's diagnostic SHALL be reused. A resulting `stale` state with absent diagnostic keys after the stale-before-first-write transition and before a new generation attempt SHALL mean only that no generation failure is recorded for the current stale state; it SHALL not be reported as an interruption or as success. The read-only review loop SHALL report the diagnostic-unavailable interruption explicitly only for `materializing` with absent keys, and SHALL report the no-record stale condition without asserting an interruption. The keys SHALL remain available while they describe the current `failed` or `stale` failure, SHALL be cleared when a generation or reconciliation commits `overview.state: current`, and SHALL be absent for `unmaterialized` and for a stale state that only records source modification before any generation failure. The review loop SHALL use these named keys as the durable source for parent-authored diagnostics.

#### Scenario: dispatch failure survives the chat

- **WHEN** the parent cannot dispatch the generator
- **THEN** it writes `overview.failure_kind: dispatch-failed` and `overview.failure_details` with the non-empty dispatch diagnostic in `.openspec.yaml` and sets `overview.state: failed` or `stale` according to materialization history
- **AND** a later process can recover the diagnostic without reading conversation history

#### Scenario: malformed envelope survives the chat

- **WHEN** the parent detects a malformed or empty generator envelope
- **THEN** it writes `overview.failure_kind: generation-error` and the non-empty contract-violation diagnostic to `overview.failure_details` in `.openspec.yaml`
- **AND** the review loop can name that exact persisted value without relying on the generator file or the parent conversation

#### Scenario: successful retry clears the prior diagnostic

- **WHEN** a later generation or reconciliation succeeds after a failed or stale state
- **THEN** the worker commits `overview.state: current`
- **AND** it clears `overview.failure_details` so a prior failure is not reported as current
- **AND** it clears `overview.failure_kind` so a prior failure classification is not reported as current

#### Scenario: a new stale transaction clears an old diagnostic before abandonment

- **WHEN** a post-materialization source-modifying run begins, sets `overview.state: stale`, and then is cancelled or abandoned before a new generation attempt starts
- **THEN** the worker clears both `overview.failure_kind` and `overview.failure_details` at the stale-before-first-write transition
- **AND** the resulting stale state does not expose the prior attempt's diagnostic as the cause of the current state
- **AND** no new failure diagnostic is persisted because no new generation attempt failed

#### Scenario: interrupted attempt leaves an explicit diagnostic-unavailable state

- **WHEN** the worker clears both diagnostic keys for a new generation attempt and is lost before classifying that attempt's outcome
- **THEN** the persisted `materializing` state may have absent `overview.failure_kind` and `overview.failure_details`
- **AND** that absence means the attempt was interrupted before failure classification, not that the attempt succeeded or had no failure
- **AND** a later read-only review reports the diagnostic as unavailable rather than reusing an older diagnostic

#### Scenario: stale source modification has no generation diagnostic

- **WHEN** the worker sets `overview.state: stale`, clears both diagnostic keys, and is cancelled or abandoned before a new generation attempt starts
- **THEN** a later read-only review reports that no generation failure diagnostic is recorded for the current stale state
- **AND** it does not describe the state as an interrupted generation attempt, infer success, reuse an older diagnostic, produce findings, or emit a `Summary:` tally

#### Scenario: a new dispatch clears an old diagnostic before materializing

- **WHEN** a first-materialization or regeneration attempt reaches `materializing` and is about to dispatch the generator after a prior failed or stale attempt
- **THEN** the worker clears both `overview.failure_kind` and `overview.failure_details` immediately before dispatch
- **AND** a diagnostic is persisted only if this current dispatch or generation attempt produces a new failure

### Requirement: Failure diagnostics are surfaced at the design failure boundary

The design worker SHALL surface the applicable non-empty `failure_details` to the user at the point every overview-generation failure is mapped, including generator validation failures, generation errors, dispatch failures, malformed or empty envelopes, and process-loss outcomes when the parent has a diagnostic. The user-facing diagnostic SHALL identify the failure kind and the relevant source, artifact, dispatch, envelope, or file location. The worker SHALL not emit the design completion sentence on a failed first materialization or failed regeneration transaction.

#### Scenario: generator details reach the user

- **WHEN** a generator-run failure is returned during first materialization or regeneration
- **THEN** the design worker presents the returned non-empty `failure_details` and its `failure_kind` to the user at the failure point

#### Scenario: parent details reach the user

- **WHEN** dispatch fails or the generator returns a malformed or empty envelope
- **THEN** the design worker presents the parent-authored non-empty `failure_details` naming the route and location to the user
- **AND** it does not report the failure with only `overview.state` or a generic failure sentence

### Requirement: Opt-out does not change overview consumer contracts

The opt-out path SHALL not add a disabled overview state, alter the existing `archive` or `status` contracts, or modify the Change Overview generator contract. Read-only consumers SHALL continue to interpret the existing state/file combinations exactly as before, including missing/unmaterialized and stale overviews.

#### Scenario: Archive and status see existing state semantics

- **WHEN** an unopted-in run leaves no overview or leaves an existing stale overview
- **THEN** `sai-archive` and `sai-status` use their current missing/unmaterialized or stale handling
- **AND** no new opt-out-specific state or contract branch is required

#### Scenario: Generator contract remains unchanged

- **WHEN** an opted-in run dispatches the Change Overview generator
- **THEN** the generator still receives its existing inputs and returns its existing five-field result envelope
- **AND** it remains the only writer of `change-overview.md`

