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

The Direct Build coordinator SHALL send the archive `--direct-build-execute` order only when `verify`, given the slice paths and the order's owned paths as the covering list, returns an empty `uncovered`. The slice paths SHALL be the implementer's unioned changed paths, the backfill-written draft paths, and the prepared plan's archive destination and synced main specs. The order SHALL carry the prepared plan's owned staging paths unchanged, which include the paths of the implementer path set sent at Step 7. While `uncovered` holds a path, the coordinator SHALL keep the order unchanged, SHALL NOT send it, and SHALL return to Step 7 with a corrected-result request that names the uncovered path and spends one `step-7` attempt, because the order is a bound copy of the prepared plan and adding a path to it directly would break the archive worker's plan-consistency rule.

#### Scenario: Incomplete commit order

- **WHEN** the order's owned paths omit a path the implementer changed after a clean prepare-time coverage check
- **THEN** the coordinator does not send the order, keeps the order unchanged, and returns to Step 7 with a corrected-result request that names the uncovered path

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

### Requirement: Resumption retains slice references and original commit authorization

Same-conversation Direct Build resumption SHALL retain the initial `base_sha`, `slice_snapshot`, execute-order `order_snapshot`, validated execution order, execution state, and the original `direct_build_commit_authorized` state with its consumption evidence. Opening a fresh no-commit-guard window SHALL replace only its window-local baseline, not immutable slice references. Resumption SHALL neither renew a consumed order nor authorize another commit.

#### Scenario: Human interruption opens a new guard window

- **WHEN** pending Direct Build work continues after a human turn
- **THEN** the coordinator uses a fresh window-local guard baseline while preserving the initial slice verification references and commit authorization state

### Requirement: Uncertain commit closure is verified before continuation

Before continuing an uncertain execute operation, the coordinator SHALL apply existing execute-order checks with the retained `order_snapshot` and verify the authorized commit against the retained order and repository evidence. A confirmed authorized commit SHALL have its reference and consumption recorded once; route closure SHALL still require acceptance of the archive result and remaining checks. A confirmed absent commit SHALL permit only pending work allowed by the existing no-effect check. Absence of a commit SHALL not authorize replay of a partially applied archive order. An inconclusive check SHALL leave execution stopped. The route SHALL never push.

#### Scenario: Authorized commit is confirmed

- **WHEN** repository evidence confirms that the retained authorized commit occurred
- **THEN** the coordinator records its reference and authorization consumption once and does not issue the consumed commit order again

#### Scenario: Commit is absent but archive effects exist

- **WHEN** the authorized commit is absent but the execute order has partial effects
- **THEN** the coordinator does not replay the order merely because no commit exists

#### Scenario: Execute outcome remains uncertain

- **WHEN** the existing checks cannot establish the execute operation's effects
- **THEN** execution remains stopped without a new order or renewed authorization

### Requirement: Direct Build delivers the implementer path set in the archive prepare envelope

The Direct Build coordinator SHALL carry the implementer path set in the Step 7 `--direct-build-prepare` envelope to the archive worker. The implementer path set SHALL be the first-seen union of the implementer's returned `changed_files`, deletions included. The envelope SHALL place a dedicated `--implementer-paths` marker line after the change name, followed by one repository-relative path per line. When the implementer path set is missing from run state at Step 7 or at Step 8, the coordinator SHALL stop the route before that dispatch or continuation and SHALL escalate under `sai/policies/obstacle-escalation.md`; it MUST NOT rebuild the set from the git index.

#### Scenario: Prepare envelope carries the implementer path set

- **WHEN** the Direct Build coordinator dispatches the archive worker at Step 7
- **THEN** the envelope holds `--direct-build-prepare`, the change name, the `--implementer-paths` marker line, and then each path of the implementer path set on its own line, including paths the implementer deleted

#### Scenario: Implementer path set lost from run state

- **WHEN** the implementer path set is missing from coordinator run state at Step 7 or Step 8, for example after a compaction
- **THEN** the coordinator stops the route before the dispatch or continuation and escalates under `obstacle-escalation.md` without reading the git index to rebuild the set

### Requirement: Direct Build checks commit coverage on the prepared plan before any execute order

After it reads the archive worker's prepared plan and before it sends any execute order, the Direct Build coordinator SHALL run the `verify` check of `sai/policies/slice-path-scope.md` § Commit coverage with `slice_snapshot`, the Step 8 slice paths, and the prepared plan's owned staging paths as the covering list. When `uncovered` is non-empty, the coordinator SHALL NOT send an execute order; it SHALL continue the same archive worker with a corrected-result request that names the uncovered paths and carries no execute order, SHALL spend one `step-7` attempt per request, and SHALL repeat the check on the corrected plan. An exhausted `step-7` budget SHALL escalate under `sai/policies/obstacle-escalation.md`.

#### Scenario: Prepared plan misses a slice path

- **WHEN** the prepare-time coverage check returns a non-empty `uncovered`
- **THEN** the coordinator sends no execute order, continues the same archive worker with a corrected-result request naming the uncovered paths, and spends one `step-7` attempt

#### Scenario: Prepared plan covers the slice

- **WHEN** the prepare-time coverage check returns an empty `uncovered`
- **THEN** the coordinator continues to Step 8
