# direct-build-commit-coverage Specification

## Purpose
Defines how the Direct Build route ensures that an archive execute order's owned paths cover every slice path before the order is sent.

## Requirements

### Requirement: Direct Build takes the initial snapshot before the implementer dispatch

The Direct Build route SHALL take one initial snapshot per slice under `sai/policies/slice-path-scope.md` before the implementer dispatch and SHALL hold the returned reference as the run state `slice_snapshot`. The reference SHALL be invocation-scoped conversation state and SHALL NOT be persisted.

#### Scenario: Step 1 opens with the snapshot

- **WHEN** the Direct Build route reaches Step 1 for a slice
- **THEN** the coordinator takes the initial snapshot as `slice_snapshot` before it dispatches the `sai-direct-build-worker`

### Requirement: An archive execute order is sent only when it covers the slice

The Direct Build coordinator SHALL send the archive `--direct-build-execute` order only when `verify`, given the slice paths and the order's owned paths as the covering list, returns an empty `uncovered`. The slice paths SHALL be the implementer's unioned changed paths, the backfill-written draft paths, and the prepared plan's archive destination and synced main specs. While `uncovered` holds a path, the coordinator SHALL add those paths to the order's owned paths and verify again.

#### Scenario: Incomplete commit order

- **WHEN** the order's owned paths omit a path the implementer changed
- **THEN** the coordinator does not send the order, adds the uncovered path to the owned paths, and verifies again

#### Scenario: Complete commit order

- **WHEN** `verify` returns an empty `uncovered` for the order's owned paths
- **THEN** the coordinator continues the same archive worker with the `--direct-build-execute` order

### Requirement: An unavailable check does not block the order

When the coverage check returns verdict `n/a`, the coordinator SHALL print one conversation line naming the `reason` and SHALL send the order.

#### Scenario: Snapshot reference is n/a

- **WHEN** the coverage check returns verdict `n/a`
- **THEN** the coordinator prints one line naming the reason and sends the order

### Requirement: Both harnesses use the same coverage rule

The commit coverage rule SHALL live in harness-neutral route text and one shared tool, so that Claude Code and opencode apply the same check.

#### Scenario: Archive coordinator plan validation

- **WHEN** the archive coordinator validates a Direct Build plan on either harness
- **THEN** it continues the worker with the execute order only after the order covers the slice per `@sai/policies/slice-path-scope.md` § Commit coverage
