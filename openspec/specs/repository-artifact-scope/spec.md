# repository-artifact-scope Specification

## Purpose
Defines which repository artifacts implementation-capable workers may write, and the protected update protocols for published OpenSpec specifications and historical ADR/DDR records.

## Requirements

### Requirement: General repository-artifact scope
An implementation-capable worker SHALL treat any repository artifact required by the crystallized change as writable, regardless of file format, including code, prompts, instructions, policies, documentation, spreadsheets, CSVs, images, and other text or binary files. The artifact SHALL be required by the change, and the scope SHALL NOT authorize unrelated changes, mutating git commands, subagent dispatch, or actions the consuming command does not otherwise authorize.

#### Scenario: Required prompt artifact is writable
- **WHEN** the crystallized change requires a prompt or policy artifact
- **THEN** the worker treats that artifact as in-scope and implements it

### Requirement: Published OpenSpec update protocol
An implementation-capable worker SHALL NOT directly modify `openspec/specs/**`. Changes to published specifications SHALL use a delta under the active change, backfill composition, and the OpenSpec archive sync operation.

#### Scenario: Published spec change uses delta path
- **WHEN** implementation requires a published specification change
- **THEN** the change is expressed through the delta, backfill, and archive sync without direct published-spec edits

### Requirement: Historical ADR and DDR evolution protocol
Existing ADR and DDR records SHALL remain unedited historical records. A decision change SHALL use a new related record with the applicable relationship among `supersede`, `reframe`, `reverse`, or `amend`. The relevant ADR or DDR index SHALL be updated only when its protocol requires it, and creating a new record SHALL NOT count as editing an existing historical record.

#### Scenario: Decision change creates related record
- **WHEN** a recorded decision must change
- **THEN** a new related record carries the applicable relationship while existing records stay unchanged

### Requirement: Role-specific scope retention
The shared scope SHALL NOT replace a consuming worker's narrower role boundary. RED SHALL remain limited to tests and authorized stubs, GREEN SHALL remain limited to authorized production files, and planning-only phases SHALL gain no broad implementation write permission from the shared policy.

#### Scenario: RED boundary survives shared scope
- **WHEN** the shared scope is in force for an apply step
- **THEN** RED stays limited to tests and authorized stubs and GREEN stays limited to authorized production files
