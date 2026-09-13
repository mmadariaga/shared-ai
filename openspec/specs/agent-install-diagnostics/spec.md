# agent-install-diagnostics Specification

## Purpose
Diagnostics for managed agent projection installs and doctor checks. The installer emits a console notice when an overwrite changes the destination body or non-tunable frontmatter; doctor compares body and non-tunable frontmatter only (tunable lines are ignored), reports missing agent files with a re-install hint, and never reports owner-sidecar files.
## Requirements
### Requirement: doctor compares body and non-tunable frontmatter only
The doctor managed-asset check SHALL compare destination agent files against source bytes exactly, including model, effort, and variant lines. A destination whose only difference is a tunable value SHALL be reported as an error naming the agent. A destination differing in body or non-tunable frontmatter SHALL be reported as an error naming the file. The check SHALL emit a record for every managed agent projection.
#### Scenario: doctor accepts a destination whose only change is a tunable
- **WHEN** a destination is byte-identical to the source except tunable lines were added, removed, or changed
- **THEN** the doctor reports an error for that agent naming the file because tunable-only drift is no longer accepted
#### Scenario: doctor flags a destination whose body or non-tunable frontmatter changed
- **WHEN** a destination differs from the source in body or non-tunable frontmatter
- **THEN** the doctor reports an error naming the agent file
#### Scenario: doctor reports every managed agent projection
- **WHEN** the doctor managed-asset check runs
- **THEN** it emits a record for every declared managed agent projection
#### Scenario: doctor flags tunable-only drift as error
- **WHEN** a destination differs from source only in tunable lines
- **THEN** the doctor reports an error for that agent

### Requirement: doctor reports missing agent files

The `doctor` managed-asset check MUST report a missing destination agent file as a record with `severity` equal to `error` and a message that mentions re-running the installer.

#### Scenario: doctor flags a missing destination
- **WHEN** a destination agent file does not exist
- **THEN** the doctor record for that agent has `severity` equal to `error`
- **AND** the doctor message matches the regular expression `/re-?install/i`

### Requirement: installer overwrites divergent body with a console notice
The installer SHALL overwrite any destination whose bytes differ from source, including tunable-only differences, with source bytes verbatim and SHALL emit a console notice naming the destination path. Identical bytes SHALL produce no notice.
#### Scenario: divergent body produces a notice, not a throw
- **WHEN** a destination exists with body, non-tunable, or tunable differences from source
- **THEN** the installer writes source bytes verbatim and emits a notice naming the destination without throwing
#### Scenario: identical body produces no notice
- **WHEN** a destination is byte-identical to source
- **THEN** the installer emits no console notice for that destination
#### Scenario: tunable-only difference produces overwrite notice
- **WHEN** a destination matches source except for tunable values
- **THEN** the installer overwrites with source bytes and emits a notice naming the destination

### Requirement: doctor never reports sidecar files

The `doctor` output MUST NOT contain any record whose `name` is `.<agent>.owner.json` or whose `message` references a sidecar file. The `managedAssetRecords` function MUST NOT enumerate sidecar files in any of its return paths.

#### Scenario: doctor output contains no sidecar records
- **WHEN** the `doctor` JSON output is inspected
- **THEN** no record has a `name` field that begins with `.sai-` and ends with `.owner.json`
- **AND** no record has a `message` field that contains the substring `.owner.json`

