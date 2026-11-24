# tasks-required-documentation Specification

## Purpose
TBD - created by archiving change tasks-implementation-context. Update Purpose after archive.

## Requirements

### Requirement: Required Documentation omits the learnings file

`/sai-2-design` SHALL write no `## Required Documentation` section in `tasks.md`, so `SAI_LEARNINGS.md` is never listed there, because the `/sai-3-implement` step brief carries its path when the file exists. `## Implementation Context` SHALL NOT carry a copy of the learnings file's entries.

#### Scenario: Design consulted the learnings file

- **WHEN** `/sai-2-design` reads `SAI_LEARNINGS.md` in its research step
- **THEN** `tasks.md` carries no `## Required Documentation` section and no copy of the learnings entries, and `## Implementation Context` holds only its `**Test Command**`
