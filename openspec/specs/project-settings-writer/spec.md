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

### Requirement: Per-key target file

`saveSettings` SHALL save each key to `.sai/settings.local.jsonc` when that file already holds the key, and to `.sai/settings.jsonc` otherwise, with the same in-place edit and atomic write for both files. The publication consent keys `publication.autoApprove` and `pr.publishAfterRun` SHALL be the exception: `saveSettings` SHALL always save them to `.sai/settings.local.jsonc`, creating that file when it is absent, granting and restricting values alike, with or without `baseOnly`, and SHALL never save them to `.sai/settings.jsonc`. With the option `baseOnly`, it SHALL save every other key to `.sai/settings.jsonc` even when the local file holds the key, SHALL leave the local file unchanged when the save holds no consent key, and SHALL NOT refuse such a save because the local file cannot be parsed. It SHALL NOT create the local file for any other key; the base file SHALL be created when missing, as on a first save. Without `baseOnly`, or when the save holds a consent key, it SHALL refuse the whole save, writing neither file, when either file cannot be parsed; with `baseOnly` and no consent key, it SHALL refuse the save when the base file cannot be parsed. It SHALL prepare every edit before the first write. A value of `undefined` for a catalogue id SHALL remove the key in place. A successful save SHALL return the list of files it wrote. When the save writes a granting value of a consent key (`publication.autoApprove: true` or `pr.publishAfterRun: yes`) and `git check-ignore` reports `.sai/settings.local.jsonc` as not ignored, the result SHALL also carry the warning `.sai/settings.local.jsonc is not ignored by git: committing it shares the publication grant with every clone. Add it to .gitignore yourself; this menu never edits .gitignore.`; the writer SHALL NOT edit any `.gitignore`.

#### Scenario: Keys split between the two files
- **WHEN** the local file holds `backlog.provider` and a save changes `backlog.provider` and `explore.overviewLanguage`
- **THEN** `backlog.provider` is written to `.sai/settings.local.jsonc`, `explore.overviewLanguage` to `.sai/settings.jsonc`, and the save returns both files

#### Scenario: Local-only change leaves the base file untouched
- **WHEN** a save changes only keys that the local file holds
- **THEN** `.sai/settings.jsonc` keeps its content and modification time

#### Scenario: Unheld key never creates the local file
- **WHEN** no local file exists and a save changes a key that is not a publication consent key
- **THEN** the key is written to `.sai/settings.jsonc` and no `.sai/settings.local.jsonc` is created

#### Scenario: Undefined removes the key
- **WHEN** a save sets a catalogue id that the file holds to `undefined`
- **THEN** the key is removed and every other byte of the file stays unchanged

#### Scenario: Unparseable local file refuses the whole save
- **WHEN** `.sai/settings.local.jsonc` cannot be parsed and a save without `baseOnly` changes any key
- **THEN** the save fails naming the local file and neither file changes

#### Scenario: Base-only save ignores a local key
- **WHEN** `.sai/settings.local.jsonc` holds `warming` and a save with `baseOnly` changes `warming`
- **THEN** `warming` is written to `.sai/settings.jsonc` and `.sai/settings.local.jsonc` stays unchanged

#### Scenario: Consent keys go to the local file and create it
- **WHEN** `.sai/settings.jsonc` holds `pr.provider` as `github`, no local file exists, and a save sets `publication.autoApprove` to `true`, `pr.publishAfterRun` to `yes`, and `pr.language` to `Euskara`
- **THEN** the save returns `.sai/settings.jsonc` and `.sai/settings.local.jsonc`, the local file holds exactly `publication.autoApprove: true` and `pr.publishAfterRun: yes`, and the base file holds exactly `pr.provider: github` and `pr.language: Euskara`

#### Scenario: Consent key without a base file creates no base file
- **WHEN** no settings file exists and a save sets `pr.publishAfterRun` to `no`
- **THEN** `.sai/settings.local.jsonc` holds `pr.publishAfterRun: no` and `.sai/settings.jsonc` does not exist

#### Scenario: Granting save warns when git does not ignore the local file
- **WHEN** a save writes `publication.autoApprove: true` in a git repository that does not ignore `.sai/settings.local.jsonc`, then the same save runs where `.gitignore` lists the file, and then a save writes `false` where the file is not ignored
- **THEN** only the first result carries the warning that committing `.sai/settings.local.jsonc` shares the publication grant with every clone, and no `.gitignore` is created or changed
