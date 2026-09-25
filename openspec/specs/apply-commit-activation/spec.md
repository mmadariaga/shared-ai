# apply-commit-activation Specification

## Purpose
TBD - created by archiving change coordinator-owned-fast-track-gates. Update Purpose after archive.

## Requirements

### Requirement: Apply Activates Session Commit Authorization Before the First Step

The apply coordinator SHALL set invocation-scoped `session_commit_authorized=true` at apply segment entry — after the standalone fast-track parse or the chained supervisor injected signal is known and before Run-Start Step Projection or first Step work — if and only if fast-track is active, and SHALL fail safely when the fast-track state is missing or invalid instead of asking for the first commit.

#### Scenario: Build apply pre-activates the first Step commit

- **WHEN** the apply segment activates with injected fast-track true before any Step dispatch
- **THEN** the coordinator sets the session grant before projection so the first Step commit behaves like later commits

### Requirement: Apply Retains Commit Visibility Exact Staging and Stops

The apply flow SHALL still print the pre-commit visibility report and proposed message before every commit, SHALL stage with `git add -- <add-list>` exactly, and SHALL retain the GREEN-conflict STOP and all non-removable stops even when the session grant skips only the authorization ask.

#### Scenario: Pre-authorized Step commit keeps its report and staging

- **WHEN** a Step reaches its commit gate with the session grant active
- **THEN** the coordinator prints visibility and message, stages exactly the listed paths, and commits without the authorization ask while preserving stops

### Requirement: Commit Grant Excludes Pushes Branch Changes and Unrelated Stops

The session commit grant SHALL cover only the per-Step commit gate and the eligible terminal documentation commit and SHALL NOT authorize pushes, branch changes, unrelated files, unresolved-conflict stops, or separate safe-operations confirmations.

#### Scenario: Grant does not leak to a push or branch change

- **WHEN** a push, branch change, unrelated file, or unresolved-conflict stop is reached with the session grant active
- **THEN** the coordinator requires the normal separate authorization and the grant does not satisfy it
