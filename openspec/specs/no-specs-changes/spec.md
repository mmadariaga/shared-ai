# no-specs-changes Specification

## Purpose
Let a change with no spec-level behavior pass every SAI phase without spec files, through a no-specs field the human agrees in the Ready to Propose block.

## Requirements

### Requirement: The Ready to Propose block carries an optional no-specs field
The Ready to Propose block format SHALL define the optional line `**Specs**: none — <reason>` right after `**Why**`. The strict and dispatchable profiles of `sai/tools/ready-to-propose.js` SHALL accept the line only in that form with a non-empty reason, and a block without the line SHALL stay valid.

#### Scenario: A block with a reasoned no-specs line is dispatchable
- **WHEN** a block carries `**Specs**: none — <reason>` with a non-empty reason after `**Why**`
- **THEN** the strict and dispatchable checks of `ready-to-propose.js` pass

#### Scenario: An empty reason or another value fails the check
- **WHEN** the `**Specs**` line has an empty reason, no em dash, or a value other than `none — <reason>`
- **THEN** the dispatchable check fails with a violation that names the Specs field

### Requirement: Only the block declaration sets skip_specs
A change SHALL carry `skip_specs: true` in its `.openspec.yaml` only when its Ready to Propose block declares `**Specs**: none — <reason>` and its `specs/` directory holds no file. No spec, design, or backfill worker SHALL set the marker on its own judgment, and a change whose block has no such line SHALL keep the rule that every phase requires at least one non-empty spec file.

#### Scenario: No declaration keeps today's behavior
- **WHEN** a block without the `**Specs**` line is planned
- **THEN** the change gets at least one spec file and no `skip_specs` key

#### Scenario: Files on disk win over the declaration
- **WHEN** a block declares no specs and files already exist under the change's `specs/`
- **THEN** the files stay in place and `skip_specs` is not set

### Requirement: /sai-1-spec writes only the proposal for a no-specs block
On a creation run whose block declares `**Specs**: none — <reason>`, `/sai-1-spec` SHALL merge `skip_specs: true` into `.openspec.yaml` before writing the proposal, keeping every other key, SHALL write `proposal.md` with no listed capability, SHALL write no file under `specs/`, and SHALL skip the delta-header check while `openspec validate` still runs.

#### Scenario: A no-specs creation run writes the proposal only
- **WHEN** `/sai-1-spec` runs from a block that declares no specs
- **THEN** the change holds `proposal.md` and `.openspec.yaml` with `skip_specs: true`, no file under `specs/`, and `check-delta-headers.js` is listed as skipped

### Requirement: Design and implementation phases accept a skip_specs change
`/sai-2-design`, `/sai-3-implement`, the `/sai-deep-review` fix tail, and `/sai-plan` SHALL treat a change whose `.openspec.yaml` sets `skip_specs: true` and whose `specs/` holds no file as having its specs. Design SHALL take the statements of `proposal.md`'s What Changes as the requirements, and the RED step SHALL anchor its tests to `proposal.md`.

#### Scenario: Design starts and designs from the proposal
- **WHEN** `/sai-2-design` runs on a change with `proposal.md`, `skip_specs: true`, and no spec file
- **THEN** it starts, references the proposal's What Changes for requirements, and lists `check-delta-headers.js` among the skipped checks

#### Scenario: Implement and deep review accept the change
- **WHEN** `/sai-3-implement` or the `/sai-deep-review` fix tail checks a change with `proposal.md`, `tasks.md`, and `skip_specs: true` but no spec file
- **THEN** the change is startable

#### Scenario: Plan counts the spec segment as done
- **WHEN** `/sai-plan` finds `proposal.md`, no file under `specs/`, and `skip_specs: true`
- **THEN** the spec segment counts as done and the report says so

### Requirement: Archive syncs no delta for a skip_specs change
`/sai-archive` SHALL treat a `specs` artifact whose status is `skipped` as a satisfied CORE artifact, SHALL report that no delta syncs, and SHALL add only the archive path to the changed-files union after a successful CLI archive. A CLI failure on such a change SHALL stop with the exact error and no content fix.

#### Scenario: A skipped specs artifact does not block the archive
- **WHEN** `/sai-archive` checks a change whose `specs` status is `skipped`
- **THEN** it does not report specs as a missing CORE artifact and reports no delta capability to sync

### Requirement: Backfill drafts no spec for a no-specs block
When the received block declares `**Specs**: none — <reason>`, backfill, including the Direct Build prepare route, SHALL draft only `.openspec.yaml` with `skip_specs: true` and `proposal.md` listing `None` under both capability subsections, unless files already exist under the change's `specs/`. The receivers SHALL accept `skip_specs: true` as an optional metadata key only on such a run and SHALL skip the delta-header check for a draft set with no `specs/` directory.

#### Scenario: A no-specs Direct Build backfill drafts no spec
- **WHEN** the Direct Build backfill prepares drafts from a block that declares no specs
- **THEN** the draft set is `.openspec.yaml` with `skip_specs: true` and `proposal.md`, with no capability spec

#### Scenario: Without the declaration no draft carries skip_specs
- **WHEN** backfill runs from a block without the `**Specs**` line
- **THEN** the drafted `.openspec.yaml` carries no `skip_specs` key

### Requirement: Explore asks the no-specs question for a no-specs candidate
On entry into `Crystallize`, after the slicing assessment and before the crystallization language gate, `/sai-explore` SHALL decide the `**Specs**` line of each block. A change or slice with no spec-level behavior, such as a pure refactor, tooling, or documentation change, is a no-specs candidate. For each candidate, and for each candidate slice in a sliced set, Explore SHALL ask once through the native picker with options `yes` and `no`, with a question that proposes a reason and states the consequence (no spec files and no delta sync at archive), and SHALL let the user edit the reason through the picker's free-text answer. Explore SHALL emit `**Specs**: none — <reason>` with the agreed reason only on a `yes` answer. For a change or slice that is not a candidate, Explore SHALL ask nothing and emit no `**Specs**` line. When the user asks for `**Specs**: none` on a change Explore did not judge a candidate, Explore SHALL state the same consequence and emit the line only after the user confirms.

#### Scenario: A candidate gets the question and a yes emits the line
- **WHEN** Explore crystallizes a no-specs candidate and the user answers `yes`
- **THEN** the block carries `**Specs**: none — <reason>` with the agreed reason right after `**Why**`

#### Scenario: A no answer emits no line
- **WHEN** Explore asks the no-specs question for a candidate and the user answers `no`
- **THEN** the block carries no `**Specs**` line

#### Scenario: Each candidate slice is asked once
- **WHEN** Explore crystallizes a sliced set that contains candidate slices
- **THEN** it asks the no-specs question once for each candidate slice

#### Scenario: A change with spec-level behavior gets no question
- **WHEN** Explore crystallizes a change or slice that has spec-level behavior
- **THEN** it asks no no-specs question and emits no `**Specs**` line

#### Scenario: A user request is confirmed before the line is emitted
- **WHEN** the user asks for `**Specs**: none` on a change Explore did not judge a candidate
- **THEN** Explore states that the change gets no spec files and no delta sync at archive, and emits the line only after the user confirms

### Requirement: The Specs field rule points to the Explore question
The `**Specs**` field rule in `sai/policies/ready-to-propose-format.md` SHALL name the no-specs question in `sai/commands/explore/steps/crystallization-protocol.md` as the step through which Explore agrees the field with the user, and the Explore step SHALL leave the line's format and validation to `sai/policies/ready-to-propose-format.md`.

#### Scenario: The format rule names the owning step
- **WHEN** a reader looks up who agrees the `**Specs**` field in `sai/policies/ready-to-propose-format.md`
- **THEN** the rule points to the no-specs question in `sai/commands/explore/steps/crystallization-protocol.md`

### Requirement: Documentation describes the no-specs case
The project and command documentation SHALL describe the no-specs case. `AGENTS.md` SHALL state that the design worker writes no specs approval key for a change with `skip_specs: true`. `docs/commands/sai-status.md` SHALL state that the specs of such a change show as `skipped`. `README.md` and the `docs/commands` pages of `sai-explore`, `sai-1-spec`, `sai-2-design`, and `sai-archive` SHALL explain the `**Specs**: none — <reason>` declaration or how that command honors `skip_specs`.

#### Scenario: AGENTS.md states the approval exception
- **WHEN** a reader reads the specs approval rules in `AGENTS.md`
- **THEN** both the Specs approval bullet and the Specs approval gate section say that a `skip_specs: true` change gets no approval key

#### Scenario: The status doc names the skipped value
- **WHEN** a reader reads `docs/commands/sai-status.md`
- **THEN** it says that the specs of a `skip_specs: true` change show as `skipped` instead of missing

#### Scenario: README and command docs explain the declaration
- **WHEN** a reader reads `README.md` or the `sai-explore`, `sai-1-spec`, `sai-2-design`, or `sai-archive` command doc
- **THEN** it explains the `**Specs**: none — <reason>` declaration or how that command handles a `skip_specs: true` change
