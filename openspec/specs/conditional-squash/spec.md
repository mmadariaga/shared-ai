# conditional-squash Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Conditional squash gate visibility
The system SHALL show the squash gate only when the selected method is rebase and fast-track is inactive, and SHALL skip it for method merge and whenever fast-track is active.
#### Scenario: Squash only on rebase normal mode
- **WHEN** the method is rebase in normal mode with a selected branch and captured provenance
- **THEN** the worker asks Squash the commits to be rebased into a single commit before rebasing? with Yes / No

### Requirement: Squash conflict-surface semantics
The system SHALL define Yes as first unifying the commits unique to the current branch (merge_base..HEAD) into one local commit so conflicts appear at most at one point, and No as replaying commit by commit so conflicts may appear on each commit.
#### Scenario: Squash yes bounds conflicts
- **WHEN** the user answers Yes on the squash gate
- **THEN** the coordinator unifies merge_base..HEAD into a single local commit before running git rebase on the selected branch
