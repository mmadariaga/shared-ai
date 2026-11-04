# doctor-harness-inventory Specification

## Purpose

Defines how `doctor` detects the installed harnesses and classifies each detected harness's expected files as present, missing, or unexpected.

## Requirements
### Requirement: harness auto-detection

The doctor SHALL auto-detect which of the two supported harnesses (Claude Code, opencode) are installed by testing whether each harness's user-global dir is present, using the same OS-aware base paths the installer computes (`~/.claude` and `~/.config/opencode`). It SHALL NOT require a `--harness` flag. A harness whose user-global dir is absent SHALL be reported as not installed rather than emitting missing-file errors for it.

#### Scenario: only installed harnesses get sections
- **WHEN** the user has a `~/.claude` dir but no opencode user-global dir
- **THEN** the doctor emits a Claude Code section and reports opencode as not installed, without flagging their expected files as missing

#### Scenario: both harnesses detected
- **WHEN** both harness user-global dirs are present
- **THEN** the doctor emits a labeled section for each harness

### Requirement: per-harness file inventory

For each detected harness, the doctor SHALL classify the harness's expected files — derived from the same source→destination logic the installer uses to populate that harness — as present, missing, or unexpected. Present means the expected file exists at its destination; missing means an expected file is absent; unexpected means a file exists in a doctor-inspected location that the installer would not have written there.

#### Scenario: missing expected file is flagged
- **WHEN** an expected wrapper or instruction file for a detected harness is absent from its destination
- **THEN** the doctor lists that file under missing for that harness and the harness section fails

#### Scenario: present files pass
- **WHEN** every expected file for a detected harness exists at its destination
- **THEN** the doctor reports those files as present and the inventory check passes for that harness

#### Scenario: unexpected file is reported
- **WHEN** a file the installer would not write is found in a doctor-inspected harness location
- **THEN** the doctor lists that file as unexpected for that harness
