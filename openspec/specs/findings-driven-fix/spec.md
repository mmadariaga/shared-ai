# findings-driven-fix Specification

## Purpose
TBD - created by archiving change review-standalone-direct-build-close. Update Purpose after archive.

## Requirements

### Requirement: Findings-Driven Fix Reuse
The standalone close SHALL build the fix input from the freshly generated review.md plus on-disk security, performance, and accessibility audits as-is without regenerating any audit, SHALL exclude open Q1 questions or block option one when unresolvable without user input, SHALL note the stale-audit provenance in chat, and SHALL dispatch the existing sai-review-fix-worker unchanged with the fix marker plus the findings input for code-only fixes.
#### Scenario: Fix input built from existing findings
- **WHEN** Direct Build is explicitly selected with remaining findings
- **THEN** the coordinator builds the as-is findings input and dispatches the existing review-fix worker for code-only fixes

### Requirement: Three-Round Convergence Guard
The fix loop SHALL reuse the same fix worker across at most three rounds driven by the ordered finding list, and a third completed round still carrying findings SHALL close as E4 non-convergence with no staging and no commit plus the manual-route note.
#### Scenario: Non-convergence after three rounds
- **WHEN** the third completed fix round still carries findings
- **THEN** the run reports for the manual route with no staging and no commit

### Requirement: Conditional Backfill and Single-Commit Local Close
The close SHALL invoke the existing sai-backfill-worker only when a finding changes requirement or design, SHALL stage only the fix union paths with path-scoped git add, SHALL author the message from staged state, and SHALL perform exactly one pre-authorized local HEREDOC commit without push, amend, or unrelated paths, remediating any guard violation with evidence first plus git reset of the guard base plus one pinned incident line before continuing without commit.
#### Scenario: Converged fix closes with one local commit
- **WHEN** the fix converges with only implementation changes and no guard violation
- **THEN** the run stages only the fix union paths and creates exactly one local commit without push
