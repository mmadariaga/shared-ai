# archive-metadata-authorship Specification

## Purpose
TBD - created by archiving change archive-retire-capabilities-key. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL hold one nominated `.openspec.yaml` write

`retire_capabilities` SHALL be the only key archive may ever write into a change's own `.openspec.yaml`. Writing approval keys and introducing new formal approval gates SHALL remain prohibited. The write SHALL preserve every other key and the file's existing formatting. The write SHALL be a **parse-verified replace-in-place**, never an append: when `retire_capabilities` is already present and is written at all, its value SHALL be replaced in place; when it is absent, the single key SHALL be inserted once. Archive MUST NOT append a second `retire_capabilities` entry, because a duplicate key makes the file invalid YAML for every CLI surface and the value the CLI honours is the parsed one, not the last line written. After writing, archive SHALL re-parse the file; if it no longer parses as valid YAML, or `retire_capabilities` does not read back as the boolean `true`, archive SHALL report that and MUST NOT invoke the CLI archive. That report SHALL name the file archive wrote and SHALL state the way forward: the file must be restored — `git checkout HEAD -- openspec/changes/<name>/.openspec.yaml` when it is tracked, or by hand when it is not — before `sai-archive` is rerun, because a `.openspec.yaml` that no longer parses makes the change unreadable to `openspec status`, the first step of archive's own pre-flight. Archive SHALL NOT revert the write itself.

#### Scenario: Only the nominated key may be written

- **WHEN** archive writes to a change's `.openspec.yaml`
- **THEN** it replaces or inserts only `retire_capabilities` in place, adds no approval key, no formal gate and no second entry, leaves every other key and the file's formatting intact, and re-parses the file before invoking the CLI, reporting the file it wrote and the restore step if the re-parse fails

### Requirement: The declaration write SHALL be conditional

With no capability-emptying delta detected, archive SHALL NOT touch `.openspec.yaml` at all.

#### Scenario: No detection means no write

- **WHEN** a change is archived with no capability-emptying delta detected in the pre-flight
- **THEN** `.openspec.yaml` is not opened for writing and is not listed among the changed files

### Requirement: The declaration write SHALL be idempotent and SHALL honour an explicit veto

Idempotence and veto SHALL be judged on the **parsed YAML value** of `retire_capabilities`, never on the literal text of the line. A parsed value of `true`, however it was written, is already a declaration: archive SHALL neither rewrite nor duplicate it. A parsed value of `false` is an explicit author veto: archive SHALL leave it untouched, write nothing, refuse the declaration, and MUST NOT invoke the CLI archive, because the CLI cannot distinguish that value from an absent key. A present value that parses to neither boolean is an unhonoured value: archive SHALL refuse the declaration and MUST NOT overwrite or coerce it. Every present-key case is therefore resolved before the write, so the write only ever inserts an absent key.

#### Scenario: An existing value is never overwritten

- **WHEN** the change's `.openspec.yaml` already carries `retire_capabilities` with a parsed value of `true`, of `false`, or of neither boolean
- **THEN** archive performs no write to that file, the existing value stands, and a parsed `true` proceeds while a parsed `false` or an unhonoured value refuses the declaration without invoking the CLI archive

### Requirement: The declaration SHALL belong to the change, not to a capability

One `retire_capabilities: true` SHALL be written per change regardless of how many capabilities the change touches. A change that empties capability `A` while modifying capability `B` SHALL receive exactly one declaration; the CLI deletes only the spec left with no requirements. Because `.openspec.yaml` lives inside the change directory, the CLI move SHALL carry the modified file with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/`, where the declaration remains the archived record of intent.

#### Scenario: One declaration covers a mixed change and travels into the archive

- **WHEN** a change empties one capability while modifying another and is archived
- **THEN** exactly one `retire_capabilities: true` is present and the modified `.openspec.yaml` is moved with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/`

### Requirement: The declaration SHALL require existing, parseable, schema-carrying metadata

Archive SHALL write the declaration only into an `openspec/changes/<name>/.openspec.yaml` that already exists, parses as valid YAML, and carries a `schema:` key. A missing file, an unparseable file, or a file without `schema:` SHALL be a declaration refusal naming the file and the missing or broken key. Archive MUST NEVER create `.openspec.yaml` and MUST NEVER author a `schema:` value, because a metadata file carrying only the retirement marker has no schema for the CLI to resolve, which makes the change unreadable to `openspec status` — the first step of archive's own pre-flight — and leaves the marker itself unhonoured.

#### Scenario: Schema-less metadata refuses the declaration

- **WHEN** a capability-emptying delta is detected and the change's `.openspec.yaml` is missing, unparseable, or carries no `schema:` key
- **THEN** archive refuses the declaration naming the file and the missing or broken key, creates no file, authors no `schema:` value, and runs no CLI archive
