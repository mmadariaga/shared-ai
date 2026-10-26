# merge-branch-scope-presentation Specification

## Purpose
Defines the eligible, recency-ordered merge branch candidates and the full-first, category-filtered conflict scope options.

## Requirements

### Requirement: Eligible source branch selection

The merge tool's preflight SHALL list as candidates, newest first, the local branches, the current branch's upstream, and each remote's default branch (the target of `refs/remotes/<remote>/HEAD`) whose commits are not already reachable from `HEAD`, each with its short `name` and full `ref`, and SHALL never list the symbolic `refs/remotes/<remote>/HEAD` itself. A missing upstream or remote SHALL add nothing and SHALL raise no error. When the invocation names no branch, the coordinator SHALL build the branch question from that receipt without another branch listing: the newest candidates up to the native picker's capacity, a picked candidate naming its full `ref`, plus the picker's free text for any other branch. The coordinator and the tool SHALL fetch nothing; candidates come from local refs only.

#### Scenario: Already-contained branches are omitted

- **WHEN** branch options are constructed from the preflight candidates
- **THEN** only branches with commits not already reachable from `HEAD` are included, and a remote branch that `HEAD` already holds is not offered

#### Scenario: No eligible source branches exist

- **WHEN** the filtered branch list is empty
- **THEN** the coordinator asks for the branch in plain text, so a branch name can still be entered.

#### Scenario: Upstream and remote default branch are offered

- **WHEN** the current branch has an upstream and `refs/remotes/origin/HEAD` points to `refs/remotes/origin/main`, and `HEAD` holds neither
- **THEN** the candidates include `origin/main` with ref `refs/remotes/origin/main` and the upstream with its full ref

#### Scenario: No remote lists only local branches

- **WHEN** the repository has no remote and the current branch has no upstream
- **THEN** the candidates hold only local branches and preflight raises no error

### Requirement: Full-first conflict scope presentation

When conflicts exist, resolution SHALL cover every affected file in every run. The worker and coordinator SHALL NOT expose `Full scope (Recommended)`, `Artifacts only (specs + ADR/DDR)`, or `Code only` as scope-selection choices, and SHALL NOT derive eligible scope options or render scope-dependent deferred-file sections.

#### Scenario: Scope categories are filtered and ordered

- **WHEN** the conflict classification contains one or more categories
- **THEN** all affected files are retained for strategy analysis and resolution without a scope-selection picker or category-specific scope choices
