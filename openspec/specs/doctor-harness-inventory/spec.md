## ADDED Requirements

### Requirement: harness auto-detection

The doctor SHALL auto-detect which of the three supported harnesses (Claude Code, opencode, Copilot) are installed by testing whether each harness's user-global dir is present, using the same OS-aware base paths the installer computes (`~/.claude`, `~/.config/opencode`, and the Copilot `Code/User` location for the current OS). It SHALL NOT require a `--harness` flag. A harness whose user-global dir is absent SHALL be reported as not installed rather than emitting missing-file errors for it.

#### Scenario: only installed harnesses get sections
- **WHEN** the user has a `~/.claude` dir but no opencode or Copilot user-global dir
- **THEN** the doctor emits a Claude Code section and reports opencode and Copilot as not installed, without flagging their expected files as missing

#### Scenario: all three harnesses detected
- **WHEN** all three harness user-global dirs are present
- **THEN** the doctor emits a labeled section for each of the three harnesses

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

### Requirement: Copilot project-local override reporting

For Copilot, the doctor SHALL inspect both the user-global prompts location and the project-local prompts location, and SHALL report when a project-local override of a prompt exists. It SHALL report the override as informational and SHALL NOT assume the override is wrong.

#### Scenario: project-local Copilot override is reported, not failed
- **WHEN** a Copilot prompt exists both user-global and project-local
- **THEN** the doctor reports the project-local override for that prompt without failing the Copilot section solely because the override exists
