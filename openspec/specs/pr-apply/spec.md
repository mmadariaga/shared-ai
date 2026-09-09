# pr-apply Specification

## Purpose
TBD - created by archiving change pr-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: pr-apply creates pull requests from stdin-supplied title and body

The `sai/tools/pr.js apply` subcommand SHALL read a pull request title and body from stdin, validate the title using pr-title-rules, and create the pull request using `gh pr create --body-file -`. It SHALL never modify the repository, create branches, or amend existing commits.

#### Scenario: creates pull request with validated title and body
- **WHEN** pr-apply receives a complete title and body on stdin
- **THEN** it validates the title against pr-title-rules, invokes `gh pr create --body-file -` to create the pull request, and reports the pull request URL on stdout
- **AND** exit 0 on success

#### Scenario: rejects invalid PR title without attempting creation
- **WHEN** pr-apply receives a title exceeding 70 characters, lacking Conventional Commits prefix, containing emoji, or ending with a period
- **THEN** it exits 1 with validation error and does not invoke gh or modify the repository
- **AND** no file is written and no pull request is created

#### Scenario: validates title using imported lint function
- **WHEN** pr-apply validates the title format
- **THEN** it imports and calls `checkPrTitleRules` from `sai/tools/lint.js` as a library function
- **AND** never spawns a separate linting process or subprocess

### Requirement: pr-apply delegates authorization decisions to collect and push/pull-request operations

The apply subcommand relies on prior data collection by pr-collect to determine readiness (upstream presence and gh authentication). Each operation — push to upstream and pull-request creation — requests its own authorization through standard git and gh mechanisms. Apply SHALL never perform branch configuration, credential management, or upstream availability checks; these remain the responsibility of the caller and the respective tools.

#### Scenario: assumes upstream and authentication preconditions
- **WHEN** pr-apply invokes `gh pr create`
- **THEN** it assumes upstream tracking is configured and gh is authenticated, delegating any failure to gh's own error handling
- **AND** gh's exit code and error output are reported as-is to the user

#### Scenario: respects push authorization contract
- **WHEN** the pull request body references unpushed commits
- **THEN** any required push operation is requested and authorized independently, outside the apply flow
- **AND** pr-apply focuses only on title validation and pull request creation

