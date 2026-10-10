# findings-driven-fix Specification

## Purpose
Closes a review with an optional findings-driven fix: the review-fix worker fixes the remaining findings and the coordinator lands them in one local commit.

## Requirements

### Requirement: Findings-Driven Fix Reuse

The `/sai-5-review` Direct Build close SHALL build the fix input from `review.md` plus the existing on-disk security, performance, and accessibility audits as-is, even when those audit artifacts are stale. The `/sai-review` Direct Build close SHALL build the fix input from `review.md` plus only the security, performance, and accessibility audits activated and regenerated in that same run. Both routes SHALL not regenerate any audit. They SHALL treat every finding that is not a Question as fixable. They SHALL hold no finding back for a requirement or design change and SHALL route no finding to `/sai-1-spec` or `/sai-2-design`. An open Question (`Q*`) SHALL enter the fix input only when the user answers it in the round. Before dispatching the existing `sai-review-fix-worker`, the close SHALL show the open findings, resolve the round into a validated selection of findings and exclusions, and then pass only the selected findings and a labeled exclusion list. Excluded findings and unanswered Questions SHALL remain unresolved and SHALL not be treated as outstanding fix work.

#### Scenario: Fix input built from existing findings

- **WHEN** the user chooses to fix in the Direct Build round with open findings remaining
- **THEN** the coordinator builds the as-is findings input and dispatches the existing review-fix worker for the selected findings, routing no finding to another command

#### Scenario: Fix input uses the selected findings

- **WHEN** the user chooses to fix in the Direct Build round with remaining fixable findings or answered Questions
- **THEN** the existing fix worker SHALL receive only the selected findings, each answered Question with its answer, and the exclusion list, without regenerated audits or excluded findings.

#### Scenario: Invalid exclusions block dispatch

- **WHEN** a report's free-text answer carries an unknown or unqualified ID, an answer to a non-Question, or an exclusion of a Question
- **THEN** the close SHALL display the valid source-qualified IDs and SHALL dispatch no fix worker until the answer is valid or the close ends.

### Requirement: Three-Round Convergence Guard

The fix loop SHALL reuse the same fix worker across at most three rounds driven by the ordered outstanding selected-finding list, while the initial exclusion list remains in force. Excluded findings SHALL not count as outstanding work. A third completed round that still carries selected findings or an unauthorized change SHALL stage nothing, SHALL commit nothing, and SHALL append the non-convergence close after the caller's close. That close SHALL state that nothing was committed, SHALL name the selected findings still open, and SHALL list the modified files left uncommitted. A worker `failed` result before writing that names an excluded-finding dependency SHALL stage and commit nothing and SHALL return to the Direct Build round for one revised round followed by a fresh dispatch. A second such conflict in the same close, a diff that fixes or cannot separate an excluded finding, or any other worker failure SHALL close with no staging and no commit through the caller's decline path.

#### Scenario: Non-convergence after three rounds

- **WHEN** the third completed fix round still carries selected findings
- **THEN** the run SHALL stage and commit nothing and SHALL append the non-convergence close, which states that nothing was committed, names the selected findings still open, and lists the modified files left uncommitted

#### Scenario: Excluded findings do not extend convergence

- **WHEN** a completed round leaves only findings that the user excluded
- **THEN** the loop SHALL treat the selected scope as converged and SHALL not dispatch another fix round for those exclusions.

#### Scenario: Coupled exclusion reported before writing asks once for a revised selection

- **WHEN** the fix worker returns failed before writing because a selected fix necessarily resolves an excluded finding
- **THEN** the close SHALL stage and commit nothing, show the dependency, and ask the Direct Build round once more before a fresh dispatch

#### Scenario: Coupled exclusion found in the diff declines the close

- **WHEN** the resulting diff fixes an excluded finding or cannot separate it from a selected fix
- **THEN** the close SHALL stage and commit nothing, report the written paths, and run the caller's decline close

### Requirement: Single-Commit Local Close
The close SHALL dispatch no backfill worker, SHALL stage only the fix union paths with path-scoped git add, SHALL author the message from staged state, and SHALL perform exactly one pre-authorized local HEREDOC commit without push, amend, or unrelated paths, remediating any guard violation exactly as the no-commit-guard policy prescribes before continuing without commit.
#### Scenario: Converged fix closes with one local commit
- **WHEN** the fix converges with only implementation changes and no guard violation
- **THEN** the run stages only the fix union paths and creates exactly one local commit without push
