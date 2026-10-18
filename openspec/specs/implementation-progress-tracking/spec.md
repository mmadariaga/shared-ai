# implementation-progress-tracking Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.

## Requirements

### Requirement: schema-apply-tracks-implementation

The `apply` block of `openspec/schemas/sai-workflow/schema.yaml` SHALL set `requires: [tasks]` and `tracks: tasks.md`, so the schema apply progress is tracked on `tasks.md`.

#### Scenario: schema apply.tracks is implementation.md
- **WHEN** `openspec status --change <name> --json` is called and the status is inspected
- **THEN** the schema apply.tracks value does not resolve to `implementation.md`, and resolves to `tasks.md`
