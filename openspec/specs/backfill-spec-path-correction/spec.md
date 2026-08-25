# backfill-spec-path-correction Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: Backfill writes capability specs to the change-scoped path

The `/sai-backfill` command SHALL create or update capability specs at `openspec/changes/{name}/specs/{capability}/spec.md`, not at `openspec/specs/{capability}/spec.md`. This ensures all backfill artifacts live under the single change directory.

#### Scenario: backfill writes to change-scoped path
- **WHEN** `/sai-backfill` generates capability specs
- **THEN** files are written to `openspec/changes/{name}/specs/{capability}/spec.md`

#### Scenario: existing spec path reference is updated
- **WHEN** `sai/commands/backfill/instructions.md` Phase 5c is read
- **THEN** the path references `openspec/changes/{name}/specs/{capability}/spec.md`
