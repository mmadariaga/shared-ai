# conditional-squash Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Squash conflict-surface semantics
The system SHALL define `Rebase with squash` as first unifying the commits unique to the current branch (`merge_base..HEAD`) into one local commit so conflicts appear at most at one point and then rebasing that single commit, and SHALL define `Rebase` alone as replaying commit by commit so conflicts may appear on each commit, with this context carried in the method gate summary.
#### Scenario: Shortcut preserves yes and no semantics
- **WHEN** the user selects `Rebase with squash` versus `Rebase` alone
- **THEN** the coordinator runs unify-then-rebase for the shortcut and plain commit-by-commit rebase for `Rebase` alone
#### Scenario: Squash yes bounds conflicts
- **WHEN** the user selects `Rebase with squash`
- **THEN** the coordinator unifies `merge_base..HEAD` into a single local commit before running git rebase on the selected branch
