# doctor-cli-version-report Specification

## Purpose
TBD - created by archiving change setup-checks-cli-min-versions. Update Purpose after archive.

## Requirements

### Requirement: Doctor reports CLI versions below the supported minimum

Doctor SHALL read the version of the `openspec` and `codegraph` binaries the PATH resolves, as the first `X.Y.Z` of their `--version` output, and SHALL report one record per present binary in a `[CLI versions]` section, compared with the minimum SAI supports (OpenSpec 1.13.1, CodeGraph 1.6.4). A version below the minimum SHALL be a `warn` that names the installed and the minimum version; a version output with no `X.Y.Z` SHALL be a `warn` that the version is unverified; a version at or above the minimum SHALL be `ok`. Doctor SHALL only report: it SHALL NOT offer or run an upgrade. The doctor opencode version check SHALL keep its behavior, including its `error` below 2.2.0.

#### Scenario: Version below the minimum warns
- **WHEN** doctor reads an `openspec` or `codegraph` version below its minimum
- **THEN** it reports a `warn` record naming the installed and the minimum version, with an upgrade recommendation, and runs no upgrade

#### Scenario: Version at or above the minimum passes
- **WHEN** doctor reads an `openspec` or `codegraph` version equal to or above its minimum
- **THEN** it reports an `ok` record for that CLI

#### Scenario: Unreadable version warns
- **WHEN** a present binary's version output holds no `X.Y.Z`
- **THEN** doctor reports a `warn` record saying the version is unverified

#### Scenario: Absent CodeGraph is not reported
- **WHEN** the `codegraph` binary is not installed
- **THEN** doctor reports no CodeGraph version record

#### Scenario: Absent OpenSpec keeps its presence check
- **WHEN** the `openspec` binary is not installed
- **THEN** doctor reports no OpenSpec version record and the project health presence check still reports the missing binary

#### Scenario: Opencode check unchanged
- **WHEN** doctor checks the opencode harness with an opencode version below 2.2.0
- **THEN** it still reports that version as an `error`
