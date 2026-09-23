# review-direct-build-close Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Review Direct Build Close Selector
The sai-review close SHALL offer a Direct Build lane only when review.md or an activated audit reports remaining findings, and SHALL close with the normal terminal when clean.
#### Scenario: Findings remain
- **WHEN** review or an activated audit reports a remaining finding
- **THEN** the close presents Direct Build versus running sai-build manually and dispatches only on explicit selection

### Requirement: Findings-Scoped Fix Input
The Direct Build input SHALL consist of review.md plus security, performance, and accessibility findings only when each audit was activated and regenerated in the same run.
#### Scenario: Non-recommended audit excluded
- **WHEN** an audit was not recommended in the same run
- **THEN** its findings are never touched nor regenerated as fix input

### Requirement: Single-Commit Local Close
The close SHALL stage only fix-union paths and perform exactly one pre-authorized local commit without push, amend, or unrelated paths.
#### Scenario: Path-scoped commit
- **WHEN** the fix converges within the round cap
- **THEN** only touched build paths are staged and one local commit is created

### Requirement: Coordinator Commit Runs Between Guard Windows
The close's stage and commit SHALL be coordinator-owned mutations that run between no-commit guard windows, like apply's commit gates. No review, audit, or fix window SHALL carry `allow_commit`; the archive worker's `--direct-build-execute` continuation stays its only carrier.
#### Scenario: Commit after convergence
- **WHEN** the fix loop converges and the coordinator stages and commits
- **THEN** no guard window is open, and every fix window's verify ran without `--allow-commit`

### Requirement: Single Shared Close Source
The standalone `/sai-5-review` close and the `/sai-review` close SHALL both follow `sai/commands/meta-review/direct-build-close.md`, each supplying only its `input`, `direct-label`, `decline-label`, and `decline-close`. Open Questions (`Q*`) SHALL stay out of the fix input, and when no remaining finding can be fixed without answering one, the close SHALL offer no selector, name the blocking Questions, and run `decline-close`.
#### Scenario: Only Questions remain
- **WHEN** every remaining finding needs an open Question answered
- **THEN** no selector is offered, the blocking Questions are named, and the decline close runs

### Requirement: Direct Build Close Git Grants
The Claude Code wrappers `commands/claude/sai-5-review.md` and `commands/claude/sai-review.md` SHALL carry the scoped grants `Bash(git diff:*)`, `Bash(git add:*)`, and `Bash(git commit:*)` for the close's fix-loop diff read, path-scoped stage, and single local commit, and no unscoped `Bash` grant.
#### Scenario: Direct Build selected in Claude Code
- **WHEN** the user selects Direct Build and the fix converges
- **THEN** the diff read, stage, and commit run without a second permission prompt
