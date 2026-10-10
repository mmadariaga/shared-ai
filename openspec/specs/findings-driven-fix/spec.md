# findings-driven-fix Specification

## Purpose
Closes a review with an optional findings-driven fix: the review-fix worker fixes the remaining findings and the coordinator lands them in one local commit.

## Requirements

### Requirement: Findings-Driven Fix Reuse

The `/sai-5-review` Direct Build close SHALL build the fix input from `review.md` plus the existing on-disk security, performance, and accessibility audits as-is, even when those audit artifacts are stale. The `/sai-review` Direct Build close SHALL build the fix input from `review.md` plus only the security, performance, and accessibility audits activated and regenerated in that same run. Both routes SHALL not regenerate any audit. They SHALL exclude all open Questions (`Q*`) and every finding whose fix changes a requirement or the design, naming those findings and routing them to `/sai-1-spec` or `/sai-2-design`. When no remaining finding can be fixed without a requirement or design change, the close SHALL offer no Direct Build selector. Before dispatching the existing `sai-review-fix-worker`, it SHALL show the available findings and resolve a validated selection of eligible findings and exclusions, then pass only the selected findings and a labeled exclusion list. Excluded findings SHALL remain unresolved and SHALL not be treated as outstanding fix work.

#### Scenario: Fix input built from existing findings

- **WHEN** Direct Build is explicitly selected with remaining findings
- **THEN** the coordinator builds the as-is findings input and dispatches the existing review-fix worker for the fixes that change no requirement or design

#### Scenario: Fix input uses the selected findings

- **WHEN** Direct Build is explicitly selected with remaining eligible findings
- **THEN** the existing fix worker SHALL receive only the selected findings and the exclusion list, without regenerated audits or excluded findings.

#### Scenario: Invalid exclusions block dispatch

- **WHEN** an exclusion is empty, unknown, ambiguous, or not source-qualified
- **THEN** the close SHALL display the valid source-qualified IDs and SHALL dispatch no fix worker until the selection is valid.

### Requirement: Three-Round Convergence Guard

The fix loop SHALL reuse the same fix worker across at most three rounds driven by the ordered outstanding selected-finding list, while the initial exclusion list remains in force. Excluded findings SHALL not count as outstanding work. A third completed round that still carries selected findings or an unauthorized change SHALL stage nothing, SHALL commit nothing, and SHALL append the non-convergence close after the caller's close. That close SHALL state that nothing was committed, SHALL name the selected findings still open, and SHALL list the modified files left uncommitted. A worker `failed` result before writing that names an excluded-finding dependency SHALL stage and commit nothing and SHALL return to findings selection for one revised selection followed by a fresh dispatch. A second such conflict in the same close, a diff that fixes or cannot separate an excluded finding, or any other worker failure SHALL close with no staging and no commit through the caller's decline path.

#### Scenario: Non-convergence after three rounds

- **WHEN** the third completed fix round still carries selected findings
- **THEN** the run SHALL stage and commit nothing and SHALL append the non-convergence close, which states that nothing was committed, names the selected findings still open, and lists the modified files left uncommitted

#### Scenario: Excluded findings do not extend convergence

- **WHEN** a completed round leaves only findings that the user excluded
- **THEN** the loop SHALL treat the selected scope as converged and SHALL not dispatch another fix round for those exclusions.

#### Scenario: Coupled exclusion reported before writing asks once for a revised selection

- **WHEN** the fix worker returns failed before writing because a selected fix necessarily resolves an excluded finding
- **THEN** the close SHALL stage and commit nothing, show the dependency, and ask for one revised selection before a fresh dispatch

#### Scenario: Coupled exclusion found in the diff declines the close

- **WHEN** the resulting diff fixes an excluded finding or cannot separate it from a selected fix
- **THEN** the close SHALL stage and commit nothing, report the written paths, and run the caller's decline close

### Requirement: Single-Commit Local Close
The close SHALL dispatch no backfill worker, SHALL stage only the fix union paths with path-scoped git add, SHALL author the message from staged state, and SHALL perform exactly one pre-authorized local HEREDOC commit without push, amend, or unrelated paths, remediating any guard violation exactly as the no-commit-guard policy prescribes before continuing without commit.
#### Scenario: Converged fix closes with one local commit
- **WHEN** the fix converges with only implementation changes and no guard violation
- **THEN** the run stages only the fix union paths and creates exactly one local commit without push
