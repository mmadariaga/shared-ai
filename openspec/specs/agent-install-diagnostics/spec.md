# agent-install-diagnostics Specification

## Purpose
Diagnostics for managed agent projection installs and doctor checks. The installer emits a console notice when an overwrite changes the destination body or non-tunable frontmatter; doctor compares body and non-tunable frontmatter only (tunable lines are ignored), reports missing agent files with a re-install hint, and never reports owner-sidecar files.

## Requirements

### Requirement: doctor compares body and non-tunable frontmatter only

The `doctor` managed-asset check MUST compute, for each managed agent projection, a `managedDiff` that compares only the body and the non-tunable frontmatter of the destination against the source. Tunable lines (`model`, `effort` for Claude; `model`, `variant` for opencode) MUST be stripped from both the destination and the source before the comparison. Differences in the stripped lines, including presence, value, and absence, MUST NOT produce a record.

#### Scenario: doctor accepts a destination whose only change is a tunable
- **WHEN** a destination agent file is byte-identical to the source except that one or more tunable lines have been added, removed, or changed
- **THEN** the doctor record for that agent has `severity` equal to `ok`
- **AND** the doctor does not emit any record whose message names the tunable key

#### Scenario: doctor flags a destination whose body or non-tunable frontmatter changed
- **WHEN** a destination agent file differs from the source in the body or in a non-tunable frontmatter line
- **THEN** the doctor record for that agent has `severity` equal to `error`
- **AND** the doctor message names the agent file

#### Scenario: doctor reports every managed agent projection
- **WHEN** the doctor managed-asset check runs
- **THEN** it emits a record for every agent destination the manifest declares as a managed agent projection
- **AND** this holds for all 7 Claude and all 7 opencode managed agent destinations

### Requirement: doctor reports missing agent files

The `doctor` managed-asset check MUST report a missing destination agent file as a record with `severity` equal to `error` and a message that mentions re-running the installer.

#### Scenario: doctor flags a missing destination
- **WHEN** a destination agent file does not exist
- **THEN** the doctor record for that agent has `severity` equal to `error`
- **AND** the doctor message matches the regular expression `/re-?install/i`

### Requirement: installer overwrites divergent body with a console notice

When the installer overwrites a destination agent file whose body or non-tunable frontmatter differs from the source, the installer MUST emit a console notice that names the destination path, and MUST NOT throw.

#### Scenario: divergent body produces a notice, not a throw
- **WHEN** the destination exists and its body or non-tunable frontmatter differs from the source
- **THEN** the installer writes the source-overwritten content to the destination
- **AND** the installer writes a line to stdout that names the destination path
- **AND** the installer returns normally

#### Scenario: identical body produces no notice
- **WHEN** the destination exists and its body and non-tunable frontmatter match the source after the tunable-preservation pass
- **THEN** the installer does not emit a console notice for that destination

### Requirement: doctor never reports sidecar files

The `doctor` output MUST NOT contain any record whose `name` is `.<agent>.owner.json` or whose `message` references a sidecar file. The `managedAssetRecords` function MUST NOT enumerate sidecar files in any of its return paths.

#### Scenario: doctor output contains no sidecar records
- **WHEN** the `doctor` JSON output is inspected
- **THEN** no record has a `name` field that begins with `.sai-` and ends with `.owner.json`
- **AND** no record has a `message` field that contains the substring `.owner.json`
