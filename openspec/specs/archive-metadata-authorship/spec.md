# archive-metadata-authorship Specification

## Purpose
TBD - created by archiving change archive-retire-capabilities-key. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL hold one nominated `.openspec.yaml` write

`retire_capabilities` SHALL be the only key archive may ever write into a change's own `.openspec.yaml`. Writing approval keys and introducing new formal approval gates SHALL remain prohibited. The write SHALL preserve every other key and the file's existing formatting.

#### Scenario: Only the nominated key may be written

- **WHEN** archive writes to a change's `.openspec.yaml`
- **THEN** it writes only `retire_capabilities`, adds no approval key or formal gate, and leaves every other key and the file's formatting intact

### Requirement: The declaration write SHALL be conditional

With no capability-emptying delta detected, archive SHALL NOT touch `.openspec.yaml` at all.

#### Scenario: No detection means no write

- **WHEN** a change is archived with no capability-emptying delta detected in the pre-flight
- **THEN** `.openspec.yaml` is not opened for writing and is not listed among the changed files

### Requirement: The declaration write SHALL be idempotent and SHALL honour an explicit veto

When the key is already present with the boolean literal `true`, archive SHALL neither rewrite nor duplicate it. When the key is already present with the boolean literal `false`, that value is an explicit user veto: archive SHALL leave it untouched, write nothing, and let the CLI invocation proceed with the veto in force.

#### Scenario: An existing value is never overwritten

- **WHEN** the change's `.openspec.yaml` already carries `retire_capabilities` as the boolean literal `true` or the boolean literal `false`
- **THEN** archive performs no write to that file and the existing value stands

### Requirement: The declaration SHALL belong to the change, not to a capability

One `retire_capabilities: true` SHALL be written per change regardless of how many capabilities the change touches. A change that empties capability `A` while modifying capability `B` SHALL receive exactly one declaration; the CLI deletes only the spec left with no requirements. Because `.openspec.yaml` lives inside the change directory, the CLI move SHALL carry the modified file with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/`, where the declaration remains the archived record of intent.

#### Scenario: One declaration covers a mixed change and travels into the archive

- **WHEN** a change empties one capability while modifying another and is archived
- **THEN** exactly one `retire_capabilities: true` is present and the modified `.openspec.yaml` is moved with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/`
