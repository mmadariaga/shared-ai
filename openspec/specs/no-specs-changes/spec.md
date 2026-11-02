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
