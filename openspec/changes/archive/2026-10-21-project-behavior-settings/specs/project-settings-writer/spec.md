## ADDED Requirements

### Requirement: Per-key target file

`saveSettings` SHALL save each key to `.sai/settings.local.jsonc` when that file already holds the key, and to `.sai/settings.jsonc` otherwise, with the same in-place edit and atomic write for both files. It SHALL NOT create the local file; the base file SHALL be created when missing, as on a first save. It SHALL refuse the whole save, writing neither file, when either file cannot be parsed, and SHALL prepare every edit before the first write. A value of `undefined` for a catalogue id SHALL remove the key in place. A successful save SHALL return the list of files it wrote.

#### Scenario: Keys split between the two files
- **WHEN** the local file holds `backlog.provider` and a save changes `backlog.provider` and `explore.overviewLanguage`
- **THEN** `backlog.provider` is written to `.sai/settings.local.jsonc`, `explore.overviewLanguage` to `.sai/settings.jsonc`, and the save returns both files

#### Scenario: Local-only change leaves the base file untouched
- **WHEN** a save changes only keys that the local file holds
- **THEN** `.sai/settings.jsonc` keeps its content and modification time

#### Scenario: Unheld key never creates the local file
- **WHEN** no local file exists and a save changes a key
- **THEN** the key is written to `.sai/settings.jsonc` and no `.sai/settings.local.jsonc` is created

#### Scenario: Undefined removes the key
- **WHEN** a save sets a catalogue id that the file holds to `undefined`
- **THEN** the key is removed and every other byte of the file stays unchanged

#### Scenario: Unparseable local file refuses the whole save
- **WHEN** `.sai/settings.local.jsonc` cannot be parsed and a save changes any key
- **THEN** the save fails naming the local file and neither file changes
