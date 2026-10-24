# merge-branch-scope-presentation Specification

## Purpose
Defines the eligible, recency-ordered merge branch candidates and the full-first, category-filtered conflict scope options.

## Requirements

### Requirement: Eligible source branch selection

The merge tool's preflight SHALL enumerate local branches with `git branch --no-merged HEAD`, newest first, and when the invocation names no branch the coordinator SHALL build the branch question from that receipt without another branch listing: the newest candidates up to the native picker's capacity, each with its exact branch name as the option value, plus the picker's free text for any other branch, excluding branches whose commits are already reachable from the current branch. The coordinator SHALL fetch nothing.

#### Scenario: Already-contained branches are omitted

- **WHEN** branch options are constructed from local branches
- **THEN** only branches with commits not already reachable from `HEAD` are included, with each exact branch name forwarded unchanged as its option value.

#### Scenario: No eligible source branches exist

- **WHEN** the filtered branch list is empty
- **THEN** the coordinator asks for the branch in plain text, so a branch name can still be entered.

### Requirement: Full-first conflict scope presentation

When conflicts exist, resolution SHALL cover every affected file in every run. The worker and coordinator SHALL NOT expose `Full scope (Recommended)`, `Artifacts only (specs + ADR/DDR)`, or `Code only` as scope-selection choices, and SHALL NOT derive eligible scope options or render scope-dependent deferred-file sections.

#### Scenario: Scope categories are filtered and ordered

- **WHEN** the conflict classification contains one or more categories
- **THEN** all affected files are retained for strategy analysis and resolution without a scope-selection picker or category-specific scope choices
