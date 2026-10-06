# merge-branch-scope-presentation Specification

## Purpose
Defines the eligible, recency-ordered merge branch candidates and the full-first, category-filtered conflict scope options.

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

When conflicts exist, resolution SHALL cover every affected file in every mode. The worker and presentation seam SHALL NOT expose `Full scope (Recommended)`, `Artifacts only (specs + ADR/DDR)`, or `Code only` as scope-selection choices, and SHALL NOT derive eligible scope options or render scope-dependent deferred-file sections.

#### Scenario: Scope categories are filtered and ordered

- **WHEN** the conflict classification contains one or more categories
- **THEN** all affected files are retained for strategy analysis and resolution without a scope-selection picker or category-specific scope choices
