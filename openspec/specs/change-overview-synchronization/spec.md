# change-overview-synchronization Specification

## Purpose

Persist and transition the change's `overview.state` key in `openspec/changes/{name}/.openspec.yaml`, and define exactly when the overview is generated, regenerated, marked stale, or marked failed across the sai-2 design lifecycle, including first materialization at `Continue`, post-materialization regeneration, reopened-run failure semantics, and the supported modification surfaces.

## Requirements

### Requirement: Persisted materialization state

The change's overview state SHALL be persisted as a durable `overview.state` key in `openspec/changes/{name}/.openspec.yaml`, with exactly one of five values:

- `unmaterialized` — no overview generation has been attempted; the expected state before the first `Continue` processing. An absent key SHALL be interpreted as `unmaterialized` for non-backfilled changes.
- `materializing` — a generator dispatch is in progress or was interrupted; the overview at `change-overview.md` SHALL NOT be presented as current until committed. This is the pre-dispatch marker of the two-phase transition.
- `failed` — `Continue` processing attempted first materialization and it failed; no valid overview exists and the change requires a retry. This is a problem state, distinct from `unmaterialized` (never attempted) and from `stale` (was materialized, sources changed).
- `current` — the last generated overview reflects the source artifacts it was derived from; the overview is the change's review surface.
- `stale` — source artifacts changed since the last materialization, or regeneration failed; the content at `change-overview.md` SHALL NOT be presented as the change's current review surface.

Transition ownership SHALL be the design worker (which owns `.openspec.yaml` writes). Every generation SHALL be a recoverable two-phase transition: the design worker SHALL set `materializing` immediately before dispatching the generator, the generator SHALL write `change-overview.md`, and the design worker SHALL commit `current` only after the generator reports success (per the closed generator result contract of the `change-overview-generation-routing` capability). The design worker SHALL set `failed` when a first-materialization dispatch fails, SHALL set `stale` when a regeneration dispatch fails, and SHALL set `stale` **before the first effective source write** of every post-materialization modification transaction — never only at transaction end. Backfilled changes SHALL carry no `overview.state` key; their overview status is not applicable. The read-only review loop SHALL NOT write the key.

Marking `stale` before the first effective source write is the conservative invariant: a successful regeneration returns the state to `current`; failure, cancellation, process loss, or chat abandonment at any point after the first write naturally leaves the conservative `stale` state, because no execution point after the write is required to record it.

An interrupted `materializing` state — a process lost after the file write or after the dispatch but before the `current` commit — SHALL be reconciled only by a writable design-worker reconciliation transaction: a re-invoked `/sai-2-design` run or the supervised design phase (the design worker exclusively owns `.openspec.yaml` transitions). The design worker SHALL verify the file at `change-overview.md` against the then-current sources; if the file is complete and consistent, it SHALL commit `current`; if the file is incomplete or inconsistent, it SHALL mark `failed` (first-materialization retry) or regenerate. The read-only `Review change-overview` transaction SHALL NOT commit or write any state: it may report that the interrupted file appears to validate against the sources, leaving the commit to a subsequent design-worker reconciliation. Until reconciliation, the `materializing` state SHALL be treated as a problem, never as current.

#### Scenario: state key transitions unmaterialized → materializing → current at first Continue
- **WHEN** the feedback gate's `Continue` action is processed
- **THEN** the design worker sets `overview.state: materializing` immediately before dispatching the generator
- **AND** after the generator reports success, the design worker commits `overview.state: current`

#### Scenario: two-phase first materialization is recoverable
- **WHEN** the process is lost after the generator wrote `change-overview.md` but before the `current` commit
- **THEN** `overview.state` remains `materializing`
- **AND** the next writable design-worker reconciliation transaction (re-invoked `/sai-2-design` or supervised design phase) verifies the file against the current sources and commits `current` if consistent, or marks `failed` / regenerates otherwise

#### Scenario: review validation reports but never reconciles
- **WHEN** a `Review change-overview` transaction encounters an interrupted `materializing` state
- **THEN** the read-only transaction reports the availability/integrity state and may note that the file appears to validate
- **AND** it does NOT write `overview.state` or commit `current` — only a subsequent design-worker reconciliation may do so

#### Scenario: failed first materialization sets the failed state
- **WHEN** a first-materialization dispatch returns a failed result per the generator result contract
- **THEN** the design worker writes `overview.state: failed` in `.openspec.yaml`
- **AND** no valid `change-overview.md` exists

#### Scenario: effective source modification marks stale before the first write
- **WHEN** an integrated surface begins a post-materialization source-modification transaction on a change whose overview is materialized
- **THEN** the design worker sets `overview.state: stale` before the first effective source-artifact write of that transaction
- **AND** a successful regeneration (via `materializing` at dispatch) sets it back to `current`

#### Scenario: abandoned transaction leaves the conservative stale state
- **WHEN** a post-materialization source-modification transaction writes one or more source artifacts and the session is then lost — cancellation, worker failure, process loss, or chat abandonment — without a successful regeneration
- **THEN** `overview.state` remains `stale` with no further write required
- **AND** no regeneration is performed

#### Scenario: backfilled change carries no state key
- **WHEN** a change with `backfilled: true` in `.openspec.yaml` is inspected
- **THEN** no `overview.state` key is present
- **AND** the overview is treated as not applicable rather than stale

### Requirement: Deferred materialization after the initial feedback loop closes

The overview SHALL NOT be generated during the initial sai-2 feedback loop, while the source artifacts are still converging. First materialization SHALL occur at exactly one successful lifecycle event: processing the feedback gate's `Continue` proceed action after all source artifacts (`design.md`, `tasks.md`, `interfaces.md`) verify successfully. A run that ends by cancellation, worker failure, chat abandonment, or any exit other than `Continue` processing SHALL NOT materialize an overview.

When `Continue` processing attempts first materialization and generation fails, including a dispatch failure or output-contract violation, the design worker SHALL set `overview.state: failed`, SHALL persist the parent- or generator-authored non-empty `failure_details` in `overview.failure_details` and its `failure_kind` in `overview.failure_kind` in `openspec/changes/{change-name}/.openspec.yaml`, SHALL report the failure-record path in `changed_files` when a generator failure record was written, and SHALL NOT emit the design completion sentence. The `.openspec.yaml` changed-files obligation is governed by `Parent-owned failure diagnostics have one durable carrier`, not by this first-materialization rule. When the generator returns a coherent failed envelope, it SHALL atomically write an explicit failure record carrying `failure_kind` and `failure_details` to `change-overview.md`; when dispatch, process loss, or an invalid envelope prevents a trusted generator failure record, the `.openspec.yaml` keys are the durable carrier and a potentially affected overview path is reported where required by the generation-routing contract. A failed first-materialization record is diagnostic state, not a valid current overview, and SHALL never be presented as the change's review surface. A later invocation SHALL retry first materialization from `failed`; a successful retry replaces the failure record with a valid overview and commits `overview.state: current`.

The generator SHALL remain the only writer of `change-overview.md`. The parent SHALL not write, delete, or repair that file in a failure path. When the generator runs and returns a coherent failed envelope, it SHALL atomically write the explicit failure record within its existing single-file boundary. When dispatch fails or the parent receives no result, no generator file write is possible; the parent SHALL preserve the prior file state and durably retain the parent-authored `overview.failure_kind` and `overview.failure_details` keys in `.openspec.yaml`, then surface those values without presenting the prior file as current.

#### Scenario: failed first materialization writes a diagnostic failure record

- **WHEN** first materialization runs and the generator returns a failed envelope after executing
- **THEN** the generator atomically writes an explicit failure record to `change-overview.md` carrying `failure_kind` and non-empty `failure_details`
- **AND** the failed record is listed in `changed_files`
- **AND** the design worker sets `overview.state: failed` and suppresses the success terminal

#### Scenario: failed first materialization by dispatch failure preserves the file

- **WHEN** first materialization fails because the generator cannot be dispatched and never runs
- **THEN** the parent authors non-empty `failure_details`, persists `overview.failure_kind: dispatch-failed` and `overview.failure_details` in `.openspec.yaml`, sets `overview.state: failed`, and leaves any prior `change-overview.md` unmodified
- **AND** the parent reports the dispatch failure and does not present the prior file as current

#### Scenario: malformed first materialization reports a potentially affected overview path

- **WHEN** first materialization returns a malformed or empty envelope after the generator may have written `change-overview.md`
- **THEN** the parent preserves the file state, reports `change-overview.md` as potentially affected in `changed_files`, and persists `overview.failure_kind: generation-error` and `overview.failure_details` in `.openspec.yaml`
- **AND** the parent does not claim that the run changed nothing and does not present the file as current

#### Scenario: later invocation retries from failed

- **WHEN** a re-invoked `/sai-2-design` run closes its feedback gate with `Continue` for a change whose state is `failed`
- **THEN** first materialization is retried from the then-current sources
- **AND** a successful retry replaces the failure record with a complete validated overview and commits `overview.state: current`

### Requirement: Post-materialization regeneration once per source-modifying request

After the first overview has been materialized for a change, every later source-modifying transaction — exactly the two writable design-worker transactions enumerated in `Supported post-materialization modification surfaces`: a re-invoked `/sai-2-design` or the supervised design phase — SHALL regenerate the overview exactly once, after all requested edits complete, so the materialized overview reflects the post-transaction source state. The `sai-explore` artifact-review loop is NOT a regeneration surface: its accepted findings are provenance that may enter one of the two writable design-worker transactions (per the correction handoff protocol), and the regeneration is triggered by the design-worker transaction that applies the edits, never by the review transaction itself. The regeneration decision SHALL be based on whether the transaction effectively modifies a source artifact, not on whether it mentions the overview.

No same-chat transaction exists after a successful `Continue`: the sai-2 coordinator terminates at `Continue` with its completion sentence and offers no continuation question, so a request made in the same chat after `Continue` is not a supported post-materialization transaction. Later source-modifying transactions run only as the enumerated command invocations or supervised flows.

#### Scenario: later source modification triggers exactly one regeneration
- **WHEN** one of the two writable design-worker transactions makes multiple effective edits to one or more source artifacts
- **THEN** the overview is regenerated exactly once, after all edits complete
- **AND** the regenerated overview reflects the final post-transaction source state

#### Scenario: regeneration reflects post-transaction sources
- **WHEN** the overview is regenerated after a source-modifying transaction
- **THEN** every section of the overview is derived from the source artifacts as they stand after the transaction's edits

#### Scenario: review-loop provenance does not add a regeneration surface
- **WHEN** the `sai-explore` artifact-review loop hands off accepted findings as provenance
- **THEN** no regeneration is triggered by the review transaction itself
- **AND** exactly one regeneration follows only when a writable design-worker transaction applies the edits

#### Scenario: same-chat request after Continue is not a supported transaction
- **WHEN** a user makes a request in the same chat after the sai-2 coordinator has terminated at `Continue`
- **THEN** the request is not a supported post-materialization transaction
- **AND** the user is directed to a re-invoked `/sai-2-design` invocation for further source modifications

### Requirement: No regeneration without effective source changes

A transaction that produces no effective source-artifact changes SHALL NOT regenerate the overview, even when the overview is already materialized. Transactions that touch only non-source artifacts or make no effective edit SHALL leave the existing overview in place, unchanged. "Effective source change" SHALL mean a transaction that creates, deletes, or changes the content of at least one source artifact relative to its pre-transaction state.

#### Scenario: non-modifying transaction leaves overview unchanged
- **WHEN** a post-materialization transaction completes without effectively modifying any source artifact (for example it modifies only `implementation.md`, or makes no edits)
- **THEN** the existing overview is left in place and is not regenerated

#### Scenario: materialization state drives generation decisions
- **WHEN** the pipeline decides whether to generate or regenerate the overview for a change
- **THEN** the decision uses the change's persisted `overview.state` — first materialization for a change with no overview (`unmaterialized`), retry of first materialization after a failed attempt (`failed`), reconciliation of an interrupted dispatch (`materializing`), regeneration for a change that already has one (`current` or `stale`)

### Requirement: Reopened-run failure semantics for a materialized overview

A re-invoked `/sai-2-design` run on a change whose overview is already materialized regenerates source artifacts wholesale before its feedback gate closes. Because the run's source writes can begin before any `Continue` processing, the design worker SHALL set `overview.state: stale` **immediately before the run's first source-artifact write** — not on exit. From that point on, any unsuccessful exit — cancellation, worker failure, chat abandonment, process loss, or any exit other than a successful `Continue` processing — leaves the conservative `stale` state without requiring a further write, because the persisted overview can no longer be trusted as current. A run that exits unsuccessfully before its first source-artifact write leaves the prior state unchanged.

This is distinct from an initial run where no overview exists: an initial unsuccessful exit leaves `overview.state` absent or `unmaterialized` and no `change-overview.md` behind, whereas a reopened run marks the existing overview stale at its first source write.

A successful `Continue` processing in a reopened run SHALL regenerate the overview exactly once and set `overview.state: current`.

#### Scenario: reopened run marks stale at its first source write
- **WHEN** a re-invoked `/sai-2-design` run on a change with a materialized overview performs its first source-artifact write
- **THEN** the design worker sets `overview.state: stale` immediately before that write
- **AND** no later execution point is required to record the stale state

#### Scenario: reopened run exits unsuccessfully after writing sources
- **WHEN** a re-invoked `/sai-2-design` run has written one or more source artifacts and then exits by cancellation, worker failure, chat abandonment, process loss, or any exit other than successful `Continue`
- **THEN** `overview.state` remains `stale` with no further write required
- **AND** no regeneration is performed

#### Scenario: reopened run exits unsuccessfully before its first source write
- **WHEN** a re-invoked `/sai-2-design` run exits unsuccessfully before writing any source artifact
- **THEN** the existing overview is left in place with its prior state
- **AND** the overview is not marked stale, because no source content changed

#### Scenario: reopened run succeeds and regenerates at Continue
- **WHEN** a re-invoked `/sai-2-design` run effectively modifies source artifacts and its feedback gate closes with a successful `Continue`
- **THEN** the overview is regenerated exactly once from the post-run sources (via `materializing` at dispatch)
- **AND** `overview.state` is committed to `current`

### Requirement: Supported post-materialization modification surfaces

The post-materialization regeneration path SHALL be owned by exactly the following writable design-worker transactions, without introducing any new numbered SAI phase or worker lifecycle:

- a re-invoked `/sai-2-design` on the same change — the design worker regenerates `design.md`, `tasks.md`, and `interfaces.md` wholesale; if the transaction effectively modified one or more source artifacts, exactly one regeneration follows at the run's successful `Continue` processing (and an unsuccessful exit leaves the overview stale per the reopened-run failure semantics);
- the supervised design phase (`explore-pipeline-supervision`) — its machine-feedback adapter continues accepted findings to the same design worker, which applies artifact-only edits to `design.md`, `tasks.md`, and `interfaces.md`; exactly one regeneration follows after those edits complete.

The `sai-explore` artifact-review loop SHALL NOT be a regeneration surface: it is a read-only origin of handoff payloads (per `review-loop-navigation`). Its `Review change-overview` transaction validates the overview against its sources and surfaces findings; the findings block itself is the handoff payload the user pastes at the feedback gate of a re-invoked `/sai-2-design`, which executes the findings through the writable design-worker transactions above — including consent-gated amendments to `proposal.md` and `specs/**` through the design phase's spec-amendment path. The regeneration is triggered by the design-worker transaction that applies the edits, never by the review transaction itself, so no two transactions can claim the same regeneration.

No other surface SHALL be treated as regeneration-integrated, and the pipeline SHALL NOT promise automatic regeneration for them. `/sai-1-spec` cannot consume an existing change (per the change-picker rules it creates new changes), so no spec-phase surface can amend the source artifacts of a change whose overview is materialized. Source modifications performed out-of-band — manual edits or any unintegrated tooling touching `proposal.md`, `specs/**`, `design.md`, `tasks.md`, or `interfaces.md` — SHALL NOT be automatically regenerated; they SHALL be detectable as stale by the next review-validation transaction (`Review change-overview` compares the overview against its sources) and by the next re-invoked `sai-2-design` run, which SHALL NOT rely on `overview.state` alone when the key was not transitioned by an integrated surface.

The regeneration decision SHALL be based on whether the transaction effectively modified a source artifact relative to its pre-transaction state, never on whether it mentioned the overview.

#### Scenario: re-invoked sai-2-design regenerates at its own Continue
- **WHEN** `/sai-2-design` is re-invoked on a change whose overview is already materialized and the run effectively modifies source artifacts
- **THEN** exactly one regeneration occurs when the run's feedback loop closes with `Continue`
- **AND** the regenerated overview reflects the post-run source state

#### Scenario: re-invoked sai-2-design with no effective changes regenerates nothing
- **WHEN** `/sai-2-design` is re-invoked on a change and the run completes without changing any source artifact content relative to its pre-request state
- **THEN** the existing overview is left in place and is not regenerated

#### Scenario: design-worker transaction regenerates once after applying review-loop provenance
- **WHEN** a writable design-worker transaction applies handed-off findings originating from the read-only review loop, effectively modifying one or more source artifacts of a change with a materialized overview
- **THEN** exactly one regeneration occurs after the design-worker edits complete
- **AND** the review transaction itself never writes, forwards, or regenerates, and no regeneration occurs when the applied edits change no source artifact

#### Scenario: supervised design phase regenerates once after machine-feedback edits
- **WHEN** the supervised design phase's machine-feedback adapter applies accepted findings that effectively modify source artifacts of a change with a materialized overview
- **THEN** exactly one regeneration occurs after the edits complete

#### Scenario: out-of-band source modification is detectable, not auto-regenerated
- **WHEN** a manual edit or unintegrated tooling modifies a source artifact of a change with a materialized overview
- **THEN** no automatic regeneration is promised or performed
- **AND** the next `Review change-overview` transaction detects the divergence between the overview and its sources and reports it as a finding

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
