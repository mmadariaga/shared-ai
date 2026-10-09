# review-direct-build-close Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Review Direct Build Close Selector

After successful review and a valid triage parse, the sai-review close SHALL offer the existing Direct Build lane when `review.md` or an activated audit reports an eligible remaining finding, including runs with zero activated audits. An eligible finding is a non-question finding whose fix changes neither requirements nor design. When no eligible findings remain, the close SHALL preserve its normal terminal, including the exact zero-audit literal for a zero-audit run and existing blocked-finding explanations. Missing review content or no legible triage section SHALL retain the error close without offering correction authorization. Existing selection, exclusions, fix rounds and write/local-commit authorization boundaries SHALL remain unchanged.

#### Scenario: Findings remain
- **WHEN** a successful review with a valid triage parse or an activated audit reports an eligible remaining finding
- **THEN** the close presents Direct Build versus running sai-build manually and dispatches only on explicit selection

#### Scenario: Zero audits with eligible review findings
- **WHEN** no audit activates after successful review and a valid triage parse, and the freshly generated `review.md` reports an eligible remaining finding
- **THEN** the composition SHALL offer the same Direct Build correction choice with the existing findings-selection and fix-loop boundaries, without dispatching an audit

### Requirement: Findings-Scoped Fix Input

The `/sai-5-review` Direct Build input SHALL use `review.md` and the existing on-disk `security.md`, `performance.md`, and `accessibility.md` artifacts as-is, even when those audit artifacts are stale. The `/sai-review` Direct Build input SHALL use the freshly generated `review.md` plus only the security, performance, and accessibility findings from audits activated and regenerated in that same run. With zero activated audits, only the freshly generated `review.md` SHALL be inspected for eligibility, findings selection, and fix input; existing non-activated audit reports SHALL remain untouched and excluded from all three stages. Before dispatch, both routes SHALL obtain a validated selection of eligible findings and exclusions, and SHALL pass only selected findings plus a labeled exclusion list to the fix worker.

#### Scenario: Non-recommended audit excluded
- **WHEN** an audit was not recommended in the same run
- **THEN** its findings are never touched nor regenerated as fix input

#### Scenario: Excluded finding is not fix input
- **WHEN** an eligible finding is excluded during the Direct Build selection
- **THEN** the fix worker input SHALL omit that finding and the finding SHALL remain unresolved in its report.

#### Scenario: Zero audits exclude stale reports
- **WHEN** no audit activates and existing audit reports contain findings from earlier runs
- **THEN** the composition SHALL inspect only the freshly generated `review.md` for eligibility, findings selection, and fix input, leaving all non-activated audit reports untouched

### Requirement: Single-Commit Local Close

The close SHALL verify the resulting diff against the selected findings and exclusions before staging, SHALL stage only fix-union paths, and SHALL perform exactly one pre-authorized local commit without push, amend, or unrelated paths. A selection with no selected findings, a pre-write worker failure, or a selected fix that cannot be separated from an excluded finding SHALL produce no staging and no commit.

#### Scenario: Path-scoped commit

- **WHEN** the fix converges within the round cap
- **THEN** only touched build paths are staged and one local commit is created

#### Scenario: Exclusion-safe converged close

- **WHEN** the fix converges without changing an excluded finding or requiring one for a selected fix
- **THEN** only the verified fix paths SHALL be staged and one local commit SHALL be created.

### Requirement: Coordinator Commit Runs Between Guard Windows
The close's stage and commit SHALL be coordinator-owned mutations that run between no-commit guard windows, like apply's commit gates. No review, audit, or fix window SHALL carry `allow_commit`; the archive worker's `--direct-build-execute` continuation stays its only carrier.
#### Scenario: Commit after convergence
- **WHEN** the fix loop converges and the coordinator stages and commits
- **THEN** no guard window is open, and every fix window's verify ran without `--allow-commit`

### Requirement: Single Shared Close Source

The standalone `/sai-5-review` close and the `/sai-review` close SHALL both follow `sai/commands/meta-review/direct-build-close.md`, each supplying only its `input`, `direct-label`, `decline-label`, and `decline-close`. After explicit Direct Build selection, both routes SHALL complete the shared findings-selection stage before dispatching the fix worker. Open Questions (`Q*`) SHALL stay out of the fix input, and when no remaining finding can be fixed without answering one, the close SHALL offer no selector, name the blocking Questions, and run `decline-close`.

#### Scenario: Only Questions remain

- **WHEN** every remaining finding needs an open Question answered
- **THEN** no selector is offered, the blocking Questions are named, and the decline close runs

#### Scenario: Both review routes gate the fix worker

- **WHEN** either review route reaches explicit Direct Build selection with fixable findings
- **THEN** the shared close SHALL resolve selected and excluded findings before dispatching, or run its decline close without dispatch when no finding remains selected.

### Requirement: Direct Build Close Git Grants
The Claude Code wrappers `commands/claude/sai-5-review.md` and `commands/claude/sai-review.md` SHALL carry the scoped grants `Bash(git diff:*)`, `Bash(git add:*)`, and `Bash(git commit:*)` for the close's fix-loop diff read, path-scoped stage, and single local commit, and no unscoped `Bash` grant.
#### Scenario: Direct Build selected in Claude Code
- **WHEN** the user selects Direct Build and the fix converges
- **THEN** the diff read, stage, and commit run without a second permission prompt

### Requirement: Findings Selection Before Fix Dispatch

After the user selects Direct Build in either review close route, the close SHALL display every issue from the reports available to that route, distinguish repeated IDs with source-qualified finding IDs, identify findings that cannot be fixed directly, and resolve a validated selection of eligible findings and exclusions before dispatching `sai-review-fix-worker`. The selection decision SHALL offer exactly three paths: `Fix all findings (Recommended)`, which selects every eligible finding; `Specify findings to exclude`, which asks for comma-separated source-qualified IDs or `all` in one follow-up input; and the native picker's built-in free-text response, which SHALL treat the submitted text as the exclusion list immediately without an intermediate turn. An empty, unknown, ambiguous, or unqualified exclusion SHALL show the valid source-qualified IDs and require a valid selection before dispatch. The value `all` SHALL be accepted only by itself. If no eligible finding is selected, it SHALL run `decline-close` without dispatch.

#### Scenario: Fix all path selects every eligible finding

- **WHEN** the user chooses `Fix all findings (Recommended)`
- **THEN** the close SHALL select every eligible finding, select no exclusions, and dispatch the fix worker with the complete eligible finding set.

#### Scenario: Follow-up exclusions path validates the submitted IDs

- **WHEN** the user chooses `Specify findings to exclude` and submits source-qualified IDs or `all`
- **THEN** the close SHALL validate the exclusion list before dispatching and SHALL pass only the remaining eligible findings to the fix worker.

#### Scenario: Native free-text path does not add a turn

- **WHEN** the user submits exclusions through the native picker's built-in free-text response
- **THEN** the close SHALL treat that text as the exclusion list immediately and SHALL not ask an intermediate exclusion question.

#### Scenario: Invalid exclusions block dispatch

- **WHEN** an exclusion is empty, unknown, ambiguous, or not source-qualified
- **THEN** the close SHALL display the valid source-qualified IDs and SHALL dispatch no fix worker until the selection is valid.

#### Scenario: All eligible findings are excluded

- **WHEN** the validated exclusion list excludes every eligible finding
- **THEN** the close SHALL report that no fix or commit will run and execute `decline-close` without dispatch.

### Requirement: Failed fix results follow the resilience rule

The shared close at `sai/commands/meta-review/direct-build-close.md` SHALL load `sai/policies/unattended-runtime-recovery.md` and, for any failed fix-worker result not covered by its named failed outcomes, or a malformed fix-worker payload, SHALL apply the resilience rule instead of defaulting to a decline-close. On yes, it SHALL correct and continue within the existing three-round cap without adding a round. On no, it SHALL stop with the policy's stop notice, stage and commit nothing, and run `decline-close`. Dependency-conflict reselection SHALL stay unchanged.

#### Scenario: A correctable fix failure

- **WHEN** the fix worker returns a failed result that the rule answers yes
- **THEN** the close corrects it and continues within the three-round cap

#### Scenario: An uncorrectable fix failure

- **WHEN** the fix worker returns a failed result or malformed payload that the rule answers no
- **THEN** the close stops with the stop notice, stages and commits nothing, and runs `decline-close`

### Requirement: Fix-loop policies load only after the fix is chosen

The shared close at `sai/commands/meta-review/direct-build-close.md` SHALL load `sai/policies/command-execution.md` and `sai/policies/unattended-runtime-recovery.md` inside its fix loop, after the user chooses to fix, and SHALL run its selector without them. The decision to offer the fix SHALL stay inside the close. Because `/sai-5-review` and `/sai-review` fetch the same close, both MUST get the same delayed loads with the same behavior.

#### Scenario: The user declines the fix

- **WHEN** the close presents its selector and the user selects the decline option
- **THEN** the close runs `decline-close` without loading `command-execution.md` or `unattended-runtime-recovery.md`

#### Scenario: The user chooses to fix

- **WHEN** the user selects the Direct Build option in the close selector
- **THEN** the close loads `command-execution.md` and `unattended-runtime-recovery.md` at the start of the fix loop and applies them to the fix loop as before
