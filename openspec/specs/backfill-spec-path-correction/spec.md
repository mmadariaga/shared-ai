# backfill-spec-path-correction Specification

## MODIFIED Requirements

### Requirement: Backfill writes capability specs to the change-scoped path

The `/sai-backfill` command SHALL create or update capability specs at `openspec/changes/{name}/specs/{capability}/spec.md`, not at `openspec/specs/{capability}/spec.md`. This ensures all backfill artifacts live under the single change directory.

#### Scenario: backfill writes to change-scoped path
- **WHEN** `/sai-backfill` generates capability specs
- **THEN** files are written to `openspec/changes/{name}/specs/{capability}/spec.md`

#### Scenario: existing spec path reference is updated
- **WHEN** `sai/instructions/backfill.md` Phase 5c is read
- **THEN** the path references `openspec/changes/{name}/specs/{capability}/spec.md`
