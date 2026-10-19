# project-settings-writer Specification

## Purpose
Saves project settings into `.sai/settings.jsonc` in place, keeping comments, unmanaged keys, and every byte outside the edited values, validated through the reader's catalogue.

## Requirements

### Requirement: Catalogue-validated values

`bin/project-settings-writer.js` SHALL validate every value through the `CATALOGUE` of `sai/tools/project-settings.js` before writing, with the supplied backlog provider ids for `backlog.provider` and the supplied to-pr provider ids for `pr.provider`, and SHALL write the canonical form the catalogue returns. A value that equals `ask` case-insensitively after trimming SHALL be written as the string `"ask"`. An id outside the catalogue or an invalid value SHALL make the whole save fail without writing.

#### Scenario: Invalid values refuse the save
- **WHEN** a save sets `backlog.provider` to an id that no supplied provider list contains, `explore.readyToProposeLanguage` to `none`, or the unknown id `backlog.type`
- **THEN** the save fails and nothing is written

#### Scenario: Code-host provider is checked against the to-pr ids
- **WHEN** a save sets `pr.provider` to an id that the supplied to-pr provider ids do not contain
- **THEN** the save fails and nothing is written

#### Scenario: Canonical forms are written
- **WHEN** a save sets `explore.readyToProposeLanguage` to `english` and `explore.overviewLanguage` to `none`
- **THEN** the file stores `English` and `None`

### Requirement: In-place edit

The writer SHALL edit the file text in place with `jsonc-parser` `modify` and `applyEdits`, so comments, keys it does not edit, and every byte outside the edited values stay unchanged. Inserted text SHALL use two-space indentation and the file's own line ending, CRLF when the file contains CRLF. The writer SHALL live under `bin/`, so the installed reader keeps no dependency.

#### Scenario: Comments and foreign keys are kept
- **WHEN** a commented file with a foreign key sets `backlog.provider` from `gitlab` to `github`
- **THEN** the saved file equals the previous text with `"gitlab"` replaced by `"github"`

#### Scenario: CRLF is kept
- **WHEN** a CRLF file gains a new key
- **THEN** the saved file contains no bare LF line ending

### Requirement: First save creation

When `.sai/settings.jsonc` is absent or contains only whitespace, the writer SHALL start from an empty object and SHALL create `.sai/` on the first save. An empty change set SHALL write nothing and create nothing.

#### Scenario: First save creates the file
- **WHEN** a project without `.sai/` saves `backlog.provider` as `gitlab`
- **THEN** `.sai/settings.jsonc` is created with `{"backlog": {"provider": "gitlab"}}` as its parsed content

#### Scenario: Empty change set
- **WHEN** a save carries no change
- **THEN** it succeeds without creating `.sai/`

### Requirement: Refused and failed saves leave the file unchanged

The writer SHALL refuse a file for which `jsonc-parser` `parse` reports errors, a file whose top-level value is not an object, and a setting whose parent key holds a non-object value, and SHALL report the cause. It SHALL write through a temporary file renamed over the target, and SHALL remove the temporary file when the write fails. On every refusal or failure the settings file SHALL stay byte-identical.

#### Scenario: Unparseable file is refused
- **WHEN** the file contains `{ "backlog": `
- **THEN** the save fails with an error saying the file cannot be edited and the file is unchanged

#### Scenario: Blocked path is refused
- **WHEN** the file is `[1]` or `{"backlog": "gitlab"}` and a save sets `backlog.provider`
- **THEN** the save fails and the file is unchanged

#### Scenario: Write error
- **WHEN** renaming the temporary file fails
- **THEN** the save fails naming the error, the file is unchanged, and no temporary file remains in `.sai/`
