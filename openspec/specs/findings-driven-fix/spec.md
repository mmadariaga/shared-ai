# findings-driven-fix Specification

## Purpose
Closes a review with an optional findings-driven fix: the review-fix worker fixes the remaining findings and the coordinator lands them in one local commit.

## Requirements

### Requirement: Findings-Driven Fix Reuse
The standalone close SHALL build the fix input from the freshly generated review.md plus on-disk security, performance, and accessibility audits as-is without regenerating any audit, SHALL exclude open Q1 questions and every finding whose fix changes a requirement or the design, naming those findings and routing them to /sai-1-spec or /sai-2-design, or block option one when no remaining finding is fixable without a requirement or design change, SHALL note the stale-audit provenance in chat, and SHALL dispatch the existing sai-review-fix-worker unchanged with the fix marker plus the findings input; the worker writes within the repository-artifact scope.
#### Scenario: Fix input built from existing findings
- **WHEN** Direct Build is explicitly selected with remaining findings
- **THEN** the coordinator builds the as-is findings input and dispatches the existing review-fix worker for the fixes that change no requirement or design

### Requirement: Three-Round Convergence Guard
The fix loop SHALL reuse the same fix worker across at most three rounds driven by the ordered finding list, and a third completed round still carrying findings SHALL close as E4 non-convergence with no staging and no commit plus the manual-route note.
#### Scenario: Non-convergence after three rounds
- **WHEN** the third completed fix round still carries findings
- **THEN** the run reports for the manual route with no staging and no commit

### Requirement: Single-Commit Local Close
The close SHALL dispatch no backfill worker, SHALL stage only the fix union paths with path-scoped git add, SHALL author the message from staged state, and SHALL perform exactly one pre-authorized local HEREDOC commit without push, amend, or unrelated paths, remediating any guard violation exactly as the no-commit-guard policy prescribes before continuing without commit.
#### Scenario: Converged fix closes with one local commit
- **WHEN** the fix converges with only implementation changes and no guard violation
- **THEN** the run stages only the fix union paths and creates exactly one local commit without push
