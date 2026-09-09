# pr-collect Specification

## Purpose
TBD - created by archiving change pr-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: pr-collect gathers pull request readiness data

The `sai/tools/pr.js collect` subcommand SHALL gather branch state, commit history, diff statistics, artifact inventory, capability specifications, authentication status, and existing pull request information from the current working directory and report all findings as a single JSON object.

#### Scenario: reports branch and parent derivation
- **WHEN** pr-collect is invoked in a git repository with established branch tracking
- **THEN** it reports the current branch name, derived parent branch name, and whether upstream tracking is configured in the JSON output
- **AND** exit 0 on success

#### Scenario: reports commit history between branches
- **WHEN** pr-collect analyzes commits from parent to HEAD
- **THEN** it includes commit entries in JSON output, each entry a string combining short SHA and commit subject (e.g., "5e1ab103 refactor(commit): extract commit tools")
- **AND** entries are ordered from parent to HEAD

#### Scenario: includes diff statistics
- **WHEN** pr-collect computes the diff from parent to HEAD
- **THEN** the JSON output includes raw git diff --stat output as a string and per-file change entries with status (added, modified, deleted) and repository-relative paths
- **AND** exit 0 on successful computation

#### Scenario: audits artifact inventory with proposal.md stop
- **WHEN** a change name is supplied and proposal.md is missing
- **THEN** pr-collect exits 1 and does not proceed further
- **AND** when proposal.md is present, the JSON artifacts object reports boolean presence of design, implementation, review, security, performance, and accessibility, plus a specs array containing repository-relative paths to capability spec files

#### Scenario: reports other absent artifacts as data
- **WHEN** design.md, implementation.md, or audit files are absent but proposal.md is present
- **THEN** pr-collect reports their absence in the artifacts object and continues execution
- **AND** the caller can inspect the complete inventory without the check stopping

#### Scenario: reports authentication and pull request state
- **WHEN** pr-collect checks tool and remote configuration
- **THEN** it reports has_upstream (boolean), gh_available (boolean), and whether a pull request already exists for the current branch in JSON output
- **AND** exit 0 on success

### Requirement: pr-collect implements standard tool interface

The pr-collect subcommand SHALL accept `--cwd` for directory targeting and `--json` flag, outputting valid JSON regardless. It SHALL exit 0 on successful data collection, exit 1 when proposal.md is missing with a supplied change name, exit 2 on configuration or I/O errors, and never modify the repository or create files.

#### Scenario: accepts working directory targeting
- **WHEN** pr-collect is invoked with `--cwd <directory>`
- **THEN** it operates on the specified directory and emits repository-relative paths in JSON output, rooted at that directory
- **AND** exit 0 on success

#### Scenario: reports errors without side effects
- **WHEN** pr-collect encounters missing .git directory, insufficient permissions, or unavailable tool configuration
- **THEN** it exits 2 with error description in JSON format
- **AND** the repository remains unmodified and no files are created

