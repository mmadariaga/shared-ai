# merge-branch-scope-presentation Specification

## Purpose
TBD.

## Requirements

### Requirement: Eligible source branch selection

The merge branch-selection procedure SHALL enumerate local branches with `git branch --no-merged HEAD`, preserving exact branch names as option values and excluding branches whose commits are already reachable from the current branch.

#### Scenario: Already-contained branches are omitted

- **WHEN** branch options are constructed from local branches
- **THEN** only branches with commits not already reachable from `HEAD` are included, with each exact branch name forwarded unchanged as its option value.

#### Scenario: No eligible source branches exist

- **WHEN** the filtered branch list is empty
- **THEN** the worker returns `No other local branches to merge.` and stops.

### Requirement: Deterministic branch recency presentation

The merge branch selector SHALL sort candidates by full committer timestamp descending and exact branch name ascending for equal timestamps, and SHALL label each option as `<branch> — last commit <YYYY-MM-DD HH:mm>`.

#### Scenario: Candidate labels include date and time

- **WHEN** an eligible branch is rendered in the selector
- **THEN** its label includes the branch name and last-commit date and time in `YYYY-MM-DD HH:mm` format without replacing the exact option value.

### Requirement: Full-first conflict scope presentation

When conflicts exist, the worker and presentation seam SHALL expose `Full scope (Recommended)` with value `full` first, followed only by applicable `Artifacts only (specs + ADR/DDR)` with value `artifacts` and `Code only` with value `code`.

#### Scenario: Scope categories are filtered and ordered

- **WHEN** the conflict classification contains one or more categories
- **THEN** the full scope option appears first and category-specific options appear afterward only when their categories are present, with stable values preserved.
