# repository-ci Specification

## Purpose
Define the repository's GitHub Actions workflow configuration for cross-platform regression checks, npm package completeness, and one stable final result.

## Requirements

### Requirement: Main pull-request and push coverage

`.github/workflows/ci.yml` SHALL trigger for pull requests targeting `main` and pushes to `main`, without path filters that exclude documentation changes. It SHALL use `pull_request`, not `pull_request_target`.

#### Scenario: Documentation-only pull request

- **WHEN** a pull request targeting `main` changes only documentation
- **THEN** the workflow configuration schedules the test matrix, package verification, and dependent final check.

#### Scenario: Main receives a push

- **WHEN** changes are pushed to `main`
- **THEN** the workflow configuration schedules the same checks for that push.

### Requirement: Cross-platform Node 22 test matrix

The workflow SHALL configure `ubuntu-latest` and `windows-latest` standard GitHub-managed runners with Node 22. Each matrix job SHALL run `npm ci` and `npm test`. Matrix fail-fast SHALL be disabled so failure on one platform does not automatically cancel the other.

#### Scenario: One platform fails

- **WHEN** one test-matrix job fails
- **THEN** matrix fail-fast does not automatically cancel the other platform's job.

### Requirement: Required interpreter preflight

Each test-matrix job SHALL verify that Bash executes successfully and that PowerShell executes successfully with major version at least 7 before running installation and tests. A failed interpreter check SHALL fail the job rather than allow interpreter-dependent test skips to count as adequate CI coverage.

#### Scenario: PowerShell 7 is unavailable

- **WHEN** PowerShell cannot execute or reports a major version below 7
- **THEN** the interpreter preflight fails before `npm ci` and `npm test`.

#### Scenario: Bash is unavailable

- **WHEN** Bash cannot execute successfully
- **THEN** the test job cannot proceed successfully to its test commands.

### Requirement: Explicit npm package completeness verification

A separate Linux job SHALL run `npm ci` and pipe `npm pack --dry-run --json` into `.github/scripts/verify-package.cjs` without publishing a package. The verifier SHALL require every file under `bin`, `commands`, `agents`, `sai`, `sai-state`, `skills`, `configs`, and `openspec/schemas`, plus `package.json` and every executable entry point declared in package.json.

The verifier SHALL accept exactly one package report with a files array, supplied either as an array report or a package-keyed object report. Missing required files or an invalid report shape SHALL cause failure.

#### Scenario: Installation input is omitted

- **WHEN** the npm report omits a required installation input for Claude Code or opencode
- **THEN** verification fails and identifies the missing path.

#### Scenario: Executable entry point is omitted

- **WHEN** the npm report omits an executable entry point declared in package.json
- **THEN** verification fails instead of accepting the package listing.

#### Scenario: Complete supported report

- **WHEN** exactly one supported package report includes every required file
- **THEN** verification succeeds and reports the required-file count without publishing a package.

#### Scenario: Invalid report shape

- **WHEN** the report lacks a files array or describes zero or multiple packages
- **THEN** verification fails with a report-shape error.

### Requirement: Stable fail-closed final check

The workflow SHALL define a final job named `CI Required` with `needs: [tests, package]` and an `always()` condition. Its result evaluation SHALL succeed only when both prerequisite results equal `success`.

#### Scenario: All prerequisites succeed

- **WHEN** the complete test matrix and package verification both report success
- **THEN** the final result evaluation succeeds.

#### Scenario: A prerequisite does not succeed

- **WHEN** either prerequisite result is failure, cancelled, skipped, or empty
- **THEN** the final result evaluation fails.

### Requirement: Read-only workflow configuration without additional storage

The workflow SHALL grant only `contents: read`, configure checkout with `persist-credentials: false`, and provide no secret references. It SHALL configure neither dependency caching nor artifact uploads and SHALL use only standard GitHub-managed runners.

#### Scenario: Contributor code is checked out

- **WHEN** either prerequisite job checks out contributor code
- **THEN** checkout does not retain write credentials and the workflow token has only content-read permission.

#### Scenario: Workflow configuration is inspected

- **WHEN** the workflow's runner, permission, and storage configuration is inspected
- **THEN** it contains standard runners, content-read permission, and no configured caching, secret references, or result uploads.
