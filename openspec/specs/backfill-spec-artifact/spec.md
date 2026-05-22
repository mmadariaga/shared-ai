## ADDED Requirements

### Requirement: Capability specs reflect actual implemented behavior
The command SHALL create or update `openspec/changes/{name}/specs/{capability}/spec.md` entries to describe the behavior that was actually implemented, as evidenced by the diff and the user's interview answers. Specs MUST NOT describe idealized or intended behavior that differs from the diff.

#### Scenario: Spec describes implemented shortcut accurately
- **WHEN** the diff shows a simplified implementation of a feature
- **THEN** the spec describes the simplified behavior, not a more complete version

#### Scenario: New capability spec created for new behavior
- **WHEN** the diff introduces behavior not covered by any existing spec
- **THEN** a new `openspec/changes/{name}/specs/{capability}/spec.md` is created

#### Scenario: Existing spec updated for changed behavior
- **WHEN** the diff changes behavior already described in an existing spec, and the user confirmed the update in the conflict detection step
- **THEN** the existing spec is updated to reflect the new behavior

### Requirement: Spec format follows openspec sai-workflow delta format
All spec files written by `/sai-backfill` SHALL use the standard sai-workflow spec delta format: `## ADDED Requirements`, `## MODIFIED Requirements`, or `## REMOVED Requirements` sections with `### Requirement:` entries, `#### Scenario:` blocks using WHEN/THEN, and SHALL/MUST normative language.

#### Scenario: Spec uses correct section headers
- **WHEN** a new spec is written
- **THEN** requirements appear under `## ADDED Requirements` and use `### Requirement:` + `#### Scenario:` structure

#### Scenario: Modified spec uses correct section header
- **WHEN** an existing spec requirement is changed
- **THEN** the updated requirement block appears under `## MODIFIED Requirements`

### Requirement: Backfill writes capability specs to the change-scoped path

The `/sai-backfill` command SHALL create or update capability specs at `openspec/changes/{name}/specs/{capability}/spec.md`, not at `openspec/specs/{capability}/spec.md`. This ensures all backfill artifacts live under the single change directory.

#### Scenario: backfill writes to change-scoped path
- **WHEN** `/sai-backfill` generates capability specs
- **THEN** files are written to `openspec/changes/{name}/specs/{capability}/spec.md`

#### Scenario: existing spec path reference is updated
- **WHEN** `sai/instructions/backfill.md` Phase 5c is read
- **THEN** the path references `openspec/changes/{name}/specs/{capability}/spec.md`

### Requirement: Specs only written after conflict detection confirmed
No spec file SHALL be written until the conflict detection step has completed and — if conflicts were found — the user has explicitly confirmed they want to proceed.

#### Scenario: Spec write gated on conflict confirmation
- **WHEN** conflict detection found overlapping specs and the user confirmed
- **THEN** spec files are written; if the user aborted, no files are written
