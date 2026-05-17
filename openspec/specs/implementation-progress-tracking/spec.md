# implementation-progress-tracking Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: archive-tracks-implementation

`sai-archive` SHALL check `openspec/changes/{name}/implementation.md` for incomplete checkbox items (`- [ ]`) when deciding whether the change is ready to archive. It SHALL NOT check `tasks.md` for this purpose.

If `implementation.md` does not exist for the change, `sai-archive` SHALL skip the completion check entirely and proceed without a warning.

#### Scenario: implementation.md exists with all tasks complete

- **WHEN** `sai-archive` is run on a change whose `implementation.md` contains only `- [x]` markers (no `- [ ]` remaining)
- **THEN** the archive proceeds without a completion warning

#### Scenario: implementation.md exists with incomplete tasks

- **WHEN** `sai-archive` is run on a change whose `implementation.md` contains one or more `- [ ]` markers
- **THEN** `sai-archive` warns the user about incomplete tasks, citing `implementation.md` (not `tasks.md`)

#### Scenario: implementation.md does not exist

- **WHEN** `sai-archive` is run on a change that has no `implementation.md` file
- **THEN** `sai-archive` skips the completion check entirely and proceeds to archive without a warning about incomplete tasks

---

### Requirement: schema-apply-tracks-implementation

The `apply.tracks` field in `openspec/schemas/sai-workflow/schema.yaml` SHALL be set to `implementation.md`.

#### Scenario: schema apply.tracks is implementation.md

- **WHEN** `openspec status --change <name> --json` is called and the status is inspected
- **THEN** the schema's `apply.tracks` value resolves to `implementation.md`, not `tasks.md`

