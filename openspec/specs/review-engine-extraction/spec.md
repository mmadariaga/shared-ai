# review-engine-extraction Specification

## Purpose

TBD - seeded from delta spec `review-engine-extraction` in change `extract-review-engine`.

## Requirements

### Requirement: review-engine-is-a-single-unit

The review work of the post-crystallization review loop — resolving the exact change directory, checking the directory and requested artifact paths, rereading every available artifact from disk, and forming findings with the shared contract's shape and tally — SHALL be one unit, defined once in `sai/commands/explore/instructions.md`, invocable independently of the five-option picker, the plain-text invitation, the chat-scoped tracked crystallized set, and every other navigation element of the loop. The unit SHALL be invoked with exactly a change name and an artifact-set designator, SHALL be invocable by any caller that supplies those inputs, and SHALL NOT depend on any navigation state. The manual review loop SHALL invoke this unit for its review work.

#### Scenario: engine is invoked by the manual loop per transaction

- **WHEN** the manual review loop processes a `Review sai-1's artifacts`, `Review sai-2's artifacts`, or `Review change-overview` selection for a change
- **THEN** the loop invokes the engine unit with that change name and the corresponding artifact-set designator
- **AND** the loop performs no review work itself

#### Scenario: engine is invocable without the picker

- **WHEN** the engine unit's definition in `sai/commands/explore/instructions.md` is inspected
- **THEN** its invocation contract names only a change name and an artifact-set designator
- **AND** its definition does not require the five-option picker, the tracked crystallized set, or any other navigation state

#### Scenario: the engine is invocable by any caller

- **WHEN** a caller supplies a change name and an artifact-set designator to the engine unit
- **THEN** the engine performs the review transaction
- **AND** it depends on no picker, no tracked set, and no other navigation state

#### Scenario: the review work is defined exactly once

- **WHEN** `sai/commands/explore/instructions.md` is audited after this change
- **THEN** the review work — directory resolution, existence checks, disk reread, and finding formation — appears exactly once, inside the engine unit
- **AND** the navigation's description of a review transaction does not restate that work

### Requirement: transaction-sequence

For each review transaction, the engine SHALL perform, in order:

1. Resolve the exact `openspec/changes/{change-name}/` directory from the authoritative change name of the transaction, without repository-wide change discovery and without substituting another change name.
2. Check whether that exact directory exists. When it does not exist, the engine SHALL report the missing change directory without presenting its child artifact paths as independently checked.
3. Only when the directory exists, check every requested artifact path — for sai-1, `proposal.md` and every file matching `specs/**/*.md`; for sai-2, `design.md`, `tasks.md`, and `interfaces.md`; for the change-overview, `change-overview.md` plus its source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`). Each missing child path or missing artifact set SHALL be reported as an absence within the existing directory, without treating it as an error; a missing source artifact of a change-overview transaction SHALL be reported the same way.
4. Reread every currently available requested artifact from disk, then form findings only from those fresh reads. Prior review output, prior findings, cached artifact contents, cached existence state, and stale absence reports SHALL be invalid evidence for the current transaction; the engine SHALL NOT conclude that contents or findings are unchanged without rereading.

#### Scenario: exact directory resolution without discovery

- **WHEN** a transaction names change A
- **THEN** the engine resolves only `openspec/changes/A/` as the change directory
- **AND** it does not run repository-wide change discovery and does not substitute another change name

#### Scenario: missing change directory is reported without child-path claims

- **WHEN** the resolved change directory does not exist
- **THEN** the engine reports the missing change directory
- **AND** it does not present the directory's child artifact paths as independently checked

#### Scenario: per-path existence checks report absences, not errors

- **WHEN** the change directory exists and a requested artifact (for example `design.md`) is absent
- **THEN** the engine reports that absence within the existing directory
- **AND** it does not treat the absence as an error

#### Scenario: findings derive only from a fresh disk reread

- **WHEN** a transaction runs after an earlier review of the same artifacts
- **THEN** the engine rereads every available requested artifact from disk
- **AND** it forms findings only from those fresh reads
- **AND** it does not reuse prior findings, cached artifact contents, cached existence state, or stale absence reports

### Requirement: artifact-sets-and-missing-specs

The engine's artifact sets SHALL be: for sai-1, `proposal.md` and every file matching `specs/**/*.md` of the change; for sai-2, `design.md`, `tasks.md`, and `interfaces.md` of the change; for the change-overview, `change-overview.md` with its source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`).

When a sai-1 transaction finds an existing exact change directory and an available `proposal.md` but no current `specs/**/*.md`, the engine SHALL review the freshly read proposal read-only, SHALL explicitly report that the sai-1 artifact set is incomplete because the normative specs are missing, SHALL state that behavior review is blocked by the missing specs, and SHALL NOT present the artifact set as fully reviewable.

#### Scenario: sai-1 artifact set

- **WHEN** a sai-1 transaction runs for a change
- **THEN** the engine checks and reads `proposal.md` and every file matching `specs/**/*.md` of that exact change

#### Scenario: sai-2 artifact set

- **WHEN** a sai-2 transaction runs for a change
- **THEN** the engine checks and reads `design.md`, `tasks.md`, and `interfaces.md` of that exact change

#### Scenario: change-overview artifact set

- **WHEN** a change-overview transaction runs for a change
- **THEN** the engine reads `change-overview.md` and its source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`)

#### Scenario: proposal exists but the sai-1 specs are missing

- **WHEN** a sai-1 transaction finds `proposal.md` but no current `specs/**/*.md` under the exact change directory
- **THEN** the engine reviews the available proposal read-only
- **AND** it explicitly reports that the sai-1 artifact set is incomplete because the normative specs are missing
- **AND** it states that behavior review is blocked by the missing specs rather than presenting the artifact set as fully reviewable

### Requirement: change-overview-transaction

A change-overview transaction SHALL produce a read-only review of the freshly read current `change-overview.md` for human presentation, reading the overview's source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`) to validate its completeness and consistency against them, and reporting divergences between the overview and its sources as findings.

The transaction SHALL complete as a review only when the overview is the change's current review surface: `overview.state` reads `current` in `openspec/changes/{name}/.openspec.yaml` AND the CLI reports `change-overview.md` present/done. When the state is non-`current` — `unmaterialized`, `materializing`, `failed`, or `stale` — or when current metadata is paired with a missing/not-`done` file, the transaction SHALL produce an availability/integrity report naming the state and the mismatch, SHALL produce no findings and no `Summary:` tally, SHALL NOT write `overview.state`, and SHALL NOT mark or clear any review-evidence item. The transaction SHALL NOT infer success from the presence of a prior overview file.

#### Scenario: current overview completes as a review

- **WHEN** a change-overview transaction runs for a change whose `overview.state` is `current` and the CLI reports `change-overview.md` present/done
- **THEN** the transaction produces a read-only review of the freshly read `change-overview.md` for human presentation
- **AND** it reads the overview's source artifacts to validate completeness and consistency, reporting divergences between the overview and its sources as findings

#### Scenario: non-current overview produces an availability report, not a review

- **WHEN** a change-overview transaction runs for a change whose `overview.state` is `unmaterialized`, `materializing`, `failed`, or `stale`, or whose current metadata is paired with a missing/not-`done` file
- **THEN** the transaction produces an availability/integrity report naming the state and the mismatch
- **AND** it produces no findings and no `Summary:` tally

#### Scenario: the engine never writes overview state

- **WHEN** any change-overview transaction runs
- **THEN** the engine does not write `overview.state` or any artifact

### Requirement: non-current-overview-diagnostics

When the availability/integrity report is produced and `overview.failure_details` is present in `openspec/changes/{name}/.openspec.yaml`, the report SHALL name that exact persisted value and its relevant location (`.openspec.yaml:overview.failure_details`). When `overview.failure_kind` is present, the report SHALL also name that classification. A failure record SHALL be described as diagnostic state and never as a current overview; the report SHALL NOT validate a failure record as a current overview.

When the state is `materializing` with neither `overview.failure_kind` nor `overview.failure_details` after a new generation attempt began, the report SHALL state that the attempt was interrupted before failure classification and that no diagnostic is available; it SHALL NOT infer success, absence of failure, or reuse an older diagnostic. When the state is `stale` with neither key after source modification before regeneration, the report SHALL state that no generation failure diagnostic is recorded for the current stale state without asserting an interruption; it SHALL NOT infer success, reuse an older diagnostic, or treat the state as a current overview.

#### Scenario: failed first-materialization report names persisted details

- **WHEN** a change-overview transaction produces an availability/integrity report for a change with `overview.state: failed` and a persisted failure record
- **THEN** the report names `failed`, the record/file mismatch, the persisted `overview.failure_kind`, and the exact non-empty value of `.openspec.yaml:overview.failure_details`

#### Scenario: stale regeneration report names persisted details

- **WHEN** a change-overview transaction produces an availability/integrity report for a change with `overview.state: stale` and a stale failure record
- **THEN** the report names `stale`, explains that the overview is not current, and names the exact persisted `.openspec.yaml:overview.failure_details` value and its relevant location

#### Scenario: a failure record is never presented as a current overview

- **WHEN** a failed or stale change contains a diagnostic failure record
- **THEN** the transaction reports availability/integrity only
- **AND** it does not validate the record as a current overview, mark review evidence, or emit a findings summary

#### Scenario: parent-owned process-loss diagnostic is reportable

- **WHEN** the parent recorded `overview.failure_kind: generation-error` and `overview.failure_details` for a dispatched generator that returned no result
- **THEN** the availability/integrity report names those persisted keys and the lost generation operation
- **AND** it produces no findings or `Summary:` tally

#### Scenario: interrupted attempt with absent diagnostics is legible

- **WHEN** the transaction sees `overview.state: materializing` with neither `overview.failure_kind` nor `overview.failure_details` after a new generation attempt began
- **THEN** the availability/integrity report says the attempt was interrupted before failure classification and that no diagnostic is available
- **AND** it does not reuse an older diagnostic, produce findings, or emit a `Summary:` tally

#### Scenario: stale state without a generation diagnostic is not an interruption

- **WHEN** the transaction sees `overview.state: stale` with neither `overview.failure_kind` nor `overview.failure_details` after source modification before regeneration
- **THEN** the availability/integrity report says that no generation failure diagnostic is recorded for the current stale state
- **AND** it does not claim an interrupted attempt, reuse an older diagnostic, produce findings, or emit a `Summary:` tally

### Requirement: finding-formation-per-the-shared-contract

The engine SHALL form findings per the shared artifact review finding contract single-sourced in `sai/policies/artifact-review-contract.md` and owned normatively by the `review-finding-format` capability, and SHALL cite that contract by reference: the engine SHALL NOT redefine the severity criteria, the finding shape, the identifier scheme, or the summary-line format inline. Every finding SHALL carry the contract's five fields in their contract order, with a severity from the contract's closed severity vocabulary and a severity-prefixed, review-scoped identifier per the contract's identifier scheme.

The engine SHALL close every completed review with the contract's base-form summary tally as its own output; caller-specific composition (for example the pipeline's pass-prefixed tally with its additional counters) is applied by the caller per the contract's composition rule. Findings SHALL be emitted in deterministic order — by severity High → Medium → Low, then by ascending numeric identifier within each severity — as the loop's existing output ordering.

#### Scenario: findings follow the shared contract

- **WHEN** the engine completes a review transaction over available artifacts
- **THEN** every finding carries the contract's five fields in their contract order
- **AND** the review closes with the contract's base-form summary tally

#### Scenario: findings are emitted in deterministic order

- **WHEN** a review transaction produces findings of more than one severity
- **THEN** they are emitted by severity High → Medium → Low
- **AND** within each severity they are emitted by ascending numeric identifier

#### Scenario: the engine output uses the base form; callers compose

- **WHEN** the engine closes a completed review
- **THEN** it emits the contract's base-form summary tally as its own output
- **AND** any caller-specific composition, such as the pipeline's pass-prefixed tally and its additional counters, is applied by the caller per the contract's composition rule

#### Scenario: the contract is cited, never restated

- **WHEN** the engine's definition in `sai/commands/explore/instructions.md` is audited
- **THEN** it references the shared contract
- **AND** it does not redefine the severity criteria, the finding shape, the identifier scheme, or the summary-line format inline

### Requirement: engine-read-only

The engine SHALL be strictly read-only: it SHALL NOT create, modify, or delete `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, or any other file under any change directory, and SHALL NOT write `overview.state` in any `.openspec.yaml`. Corrections arising from findings SHALL be applied by the owning worker through the handoff path, never by the engine.

#### Scenario: reviewed artifacts are never edited

- **WHEN** the engine runs any review transaction
- **THEN** no reviewed artifact file is created, modified, or deleted

#### Scenario: overview state is never written

- **WHEN** the engine runs a change-overview transaction
- **THEN** it does not write `overview.state` in the change's `.openspec.yaml` or any other file

### Requirement: supervised-caller-invocation

The supervised pipeline (item 10 of `sai/commands/explore/instructions.md`) SHALL invoke the engine for each of its review rounds with the authoritative change name and the phase's artifact-set designator — `sai-1` for spec-phase rounds, `sai-2` for design-phase rounds — and the engine SHALL run the same transaction sequence for the supervised caller as for the manual loop: exact directory resolution, existence checks, per-path checks, fresh disk reread, and finding formation from those reads only. The supervised invocation SHALL depend on no navigation state, no prior review output, and no cached artifact contents, and the engine SHALL remain strictly read-only for the supervised caller.

#### Scenario: supervised spec rounds invoke the engine

- **WHEN** the supervised pipeline runs a spec-phase review round
- **THEN** it invokes the engine with the change name and the `sai-1` artifact-set designator
- **AND** the engine performs its ordered transaction sequence over `proposal.md` and every `specs/**/*.md` of that exact change

#### Scenario: supervised design rounds invoke the engine

- **WHEN** the supervised pipeline runs a design-phase review round
- **THEN** it invokes the engine with the change name and the `sai-2` artifact-set designator
- **AND** the engine performs its ordered transaction sequence over `design.md`, `tasks.md`, and `interfaces.md` of that exact change

#### Scenario: the engine stays read-only for the supervised caller

- **WHEN** the supervised pipeline invokes the engine for a review round
- **THEN** the engine creates, modifies, or deletes no file under any change directory and writes no `overview.state`
- **AND** corrections arising from the round's findings are applied by the phase worker, never by the engine or explore
