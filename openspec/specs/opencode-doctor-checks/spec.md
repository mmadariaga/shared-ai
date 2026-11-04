# opencode-doctor-checks Specification

## Purpose
TBD - created by archiving change opencode-v2-subagent-only. Update Purpose after archive.

## Requirements

### Requirement: Doctor checks the installed opencode version
When doctor checks the opencode harness, it SHALL run `opencode --version`, take the first `X.Y.Z` version in the output, and compare it with the minimum supported opencode version 2.2.0. A version below 2.2.0 SHALL be an error naming the installed and the minimum version. A version at or above 2.2.0 SHALL pass with ok severity. When the `opencode` binary is not found, the command fails, or no version can be parsed from its output, doctor SHALL report a warning that the opencode version is unverified, never an error, so the exit code is unaffected.

#### Scenario: Version below the minimum errors
- **WHEN** doctor checks the opencode harness and `opencode --version` reports 2.1.9
- **THEN** the opencode version check reports an error naming installed version 2.1.9 and minimum version 2.2.0

#### Scenario: Version at or above the minimum passes
- **WHEN** doctor checks the opencode harness and `opencode --version` reports 2.2.0 or a later version
- **THEN** the opencode version check passes with ok severity

#### Scenario: Absent binary warns
- **WHEN** doctor checks the opencode harness and the `opencode` binary is not found
- **THEN** the opencode version check reports a warning that the version is unverified and the doctor exit code is not failed by it

#### Scenario: Unparseable output warns
- **WHEN** doctor checks the opencode harness and the `opencode --version` output contains no `X.Y.Z` version
- **THEN** the opencode version check reports a warning that the version is unverified

### Requirement: The opencode version check runs only for the opencode harness
Doctor SHALL run the opencode version check only when it checks the opencode harness. A doctor run that checks only Claude Code SHALL NOT invoke the `opencode` binary.

#### Scenario: Claude Code-only check never invokes opencode
- **WHEN** doctor checks only the Claude Code harness
- **THEN** it runs no `opencode` command and reports no opencode version record
