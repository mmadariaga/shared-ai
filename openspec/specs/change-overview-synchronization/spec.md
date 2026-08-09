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

The overview SHALL NOT be generated during the initial sai-2 feedback loop, while the source artifacts are still converging. First materialization SHALL occur at exactly one successful lifecycle event: processing the feedback gate's `Continue` proceed action (per `sai/policies/artifact-feedback-gate.md`) after all source artifacts (`design.md`, `tasks.md`, `interfaces.md`) verify successfully — and at no other time. A run that ends by cancellation, worker failure, chat abandonment, or any exit other than a `Continue` processing SHALL NOT materialize an overview; no overview is generated or regenerated by feedback corrections during the open loop.

The single generated overview SHALL reflect the source artifacts as they stand at that `Continue` processing.

When `Continue` processing attempts first materialization and the generation fails — a failed result envelope per the closed generator result contract of the `change-overview-generation-routing` capability, including a dispatch failure — the design worker SHALL set `overview.state: failed`, and the coordinator SHALL NOT emit the success terminal (the design completion sentence); it SHALL report the blocking failure details and leave the change incomplete. A later invocation SHALL retry first materialization: a re-invoked `/sai-2-design` on the same change processes its own `Continue` and attempts first materialization again from `failed`; a successful retry commits `overview.state: current`. Retrying is a first-materialization attempt, not a regeneration — no prior overview exists to regenerate.

#### Scenario: no overview during initial feedback
- **WHEN** the initial sai-2 feedback loop is open and the user submits feedback corrections
- **THEN** no overview is generated or regenerated by those corrections

#### Scenario: first materialization at successful Continue processing
- **WHEN** the user selects `Continue` on the feedback gate and all source artifacts verify successfully
- **THEN** the design worker sets `overview.state: materializing`, dispatches the generator, and after a successful result commits `overview.state: current`
- **AND** the overview reflects the source artifacts as they stand at that processing

#### Scenario: failed first materialization suppresses the success terminal
- **WHEN** `Continue` processing attempts first materialization and the generator returns a failed result per the closed generator result contract
- **THEN** the design worker sets `overview.state: failed`
- **AND** the coordinator does NOT emit the design completion sentence, and reports the blocking failure details

#### Scenario: later invocation retries first materialization from failed
- **WHEN** a re-invoked `/sai-2-design` run on a change with `overview.state: failed` closes its feedback gate with a successful `Continue`
- **THEN** first materialization is retried from the then-current sources (via `materializing` at dispatch)
- **AND** a successful retry commits `overview.state: current`

#### Scenario: run exits before Continue processing materializes nothing
- **WHEN** the sai-2 run ends by cancellation, worker failure, chat abandonment, or any exit other than a `Continue` processing that attempts generation
- **THEN** no overview is generated
- **AND** no `change-overview.md` is left behind
- **AND** `overview.state` remains absent or `unmaterialized`

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

The `sai-explore` artifact-review loop SHALL NOT be a regeneration surface: it is a read-only origin of handoff payloads (per `explore-post-crystallization-review-loop`). Its `Review change-overview` transaction validates the overview against its sources and surfaces findings; accepted corrections are handed to the user as provenance and executed by one of the two writable design-worker transactions above — including consent-gated amendments to `proposal.md` and `specs/**` through the design phase's spec-amendment path. The regeneration is triggered by the design-worker transaction that applies the edits, never by the review transaction itself, so no two transactions can claim the same regeneration.

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
- **WHEN** a writable design-worker transaction applies accepted findings originating from the read-only review loop, effectively modifying one or more source artifacts of a change with a materialized overview
- **THEN** exactly one regeneration occurs after the design-worker edits complete
- **AND** the review transaction itself never writes, forwards, or regenerates, and no regeneration occurs when the applied edits change no source artifact

#### Scenario: supervised design phase regenerates once after machine-feedback edits
- **WHEN** the supervised design phase's machine-feedback adapter applies accepted findings that effectively modify source artifacts of a change with a materialized overview
- **THEN** exactly one regeneration occurs after the edits complete

#### Scenario: out-of-band source modification is detectable, not auto-regenerated
- **WHEN** a manual edit or unintegrated tooling modifies a source artifact of a change with a materialized overview
- **THEN** no automatic regeneration is promised or performed
- **AND** the next `Review change-overview` transaction detects the divergence between the overview and its sources and reports it as a finding

### Requirement: Regeneration failure leaves no current overview

When regeneration fails — a failed result envelope per the closed generator result contract of the `change-overview-generation-routing` capability (validation failure including a blocking source contradiction, or generation error) — the previous overview SHALL NOT be treated as current, because the sources it was derived from have changed. The generator SHALL return the failed envelope, and within its single-file write boundary SHALL atomically replace `change-overview.md` with an explicit stale record stating that regeneration failed and the overview is not current. When the failure is a blocking source contradiction, the stale record SHALL carry the contradiction details — naming both conflicting sources and their locations and stating the one-line disagreement — not a generic failure message. The design worker SHALL set `overview.state: stale` for the change. A later successful regeneration SHALL replace the stale record with a valid overview and commit `overview.state: current`. The failed run SHALL NOT leave partially written output and SHALL NOT modify any source artifact.

When regeneration fails by dispatch failure (the generator never ran, reported as `failure_kind: dispatch-failed` by the parent) or by process loss (the parent never received a result), the generator cannot write a stale record because it never executed. In these two failure modes SHALL the prior `change-overview.md` file be left unmodified on disk, and the design worker SHALL set `overview.state: stale`; the state key — not a file record — is what prevents the prior content from being presented as current. A stale-record file write SHALL be required only when the generator actually ran and returned a failed envelope; the parent SHALL NOT write `change-overview.md` itself, because the generator exclusively owns writes to that file.

When regeneration fails by output-contract violation (the generator returned a malformed or empty envelope, per the closed generator result contract of the `change-overview-generation-routing` capability), the generator may have written or replaced `change-overview.md` before returning the malformed envelope, but the parent cannot trust the envelope's `changed_files`. In this failure mode SHALL whatever file state exists be preserved unmodified on disk (the parent does not write or delete the file), and the design worker SHALL set `overview.state: stale`; the preserved file SHALL NOT be presented as current. The file can become current only through a later writable design-worker reconciliation transaction that verifies or regenerates it.

#### Scenario: failed regeneration replaces the overview with a stale record
- **WHEN** regeneration fails with a failed result envelope from a generator that actually ran (validation failure or generation error)
- **THEN** the generator reports the failed envelope
- **AND** `change-overview.md` carries a stale record stating regeneration failed, so the previous overview content is not presented as current
- **AND** `overview.state` is set to `stale`

#### Scenario: failed regeneration on a blocking contradiction carries the details
- **WHEN** regeneration fails because two source artifacts state conflicting facts (a blocking source contradiction)
- **THEN** the stale record names both conflicting sources and their locations and states the one-line disagreement
- **AND** the failure is not reported as a generic failure and is never silently swallowed

#### Scenario: dispatch failure preserves the prior file and marks stale
- **WHEN** regeneration fails by dispatch failure (the generator never ran) or process loss (no result received)
- **THEN** the prior `change-overview.md` is left unmodified on disk
- **AND** the design worker sets `overview.state: stale`, which prevents the prior content from being presented as current
- **AND** no stale-record file write is attempted by the parent, because the generator exclusively owns writes to `change-overview.md`

#### Scenario: malformed envelope preserves file state and requires reconciliation
- **WHEN** regeneration fails by output-contract violation (the generator returned a malformed or empty envelope)
- **THEN** whatever file state exists at `change-overview.md` is preserved unmodified (the parent does not write or delete the file)
- **AND** the design worker sets `overview.state: stale`, so the preserved file is not presented as current
- **AND** the file can become current only through a later writable design-worker reconciliation transaction that verifies or regenerates it

#### Scenario: later successful regeneration restores a valid overview
- **WHEN** a later request regenerates successfully after a failed regeneration
- **THEN** the stale record (or the preserved prior file under a `stale` state) is replaced by a complete, validated overview derived from the then-current sources
- **AND** `overview.state` is committed to `current`
