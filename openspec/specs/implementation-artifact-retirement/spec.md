# implementation-artifact-retirement Specification

## Purpose
Retire `implementation.md` as a `sai-workflow` planning artifact: the implement command works from `tasks.md`, and no schema edge or archive check depends on the old plan file.

## Requirements

### Requirement: The sai-workflow schema has no implementation artifact

`openspec/schemas/sai-workflow/schema.yaml` SHALL declare ten artifacts without an `implementation` artifact, SHALL NOT ship `templates/implementation.md`, SHALL NOT list `implementation` in the `requires` of the review or audit artifacts, and SHALL set the apply block to `requires: [tasks]` and `tracks: tasks.md`.

#### Scenario: Apply block tracks tasks.md

- **WHEN** the schema's apply block is read
- **THEN** it requires only `tasks` and tracks `tasks.md`

### Requirement: Archive runs no implementation.md completion check

`/sai-archive` SHALL group ten `sai-workflow` artifacts with `proposal`, `specs`, `design`, and `tasks` as CORE, and SHALL NOT read `implementation.md` or ask about its unchecked items.

#### Scenario: Legacy implementation.md with unchecked items

- **WHEN** a change still holds an `implementation.md` from the old planner with unchecked items and `/sai-archive` runs
- **THEN** the archive neither reads nor reports that file and the file stays untouched
