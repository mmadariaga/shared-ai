> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Worker behavioral rules — "never run a mutating git command" — were enforced only as prose the worker model reads at start, not at the moment of action. In the audited session three workers made unauthorized commits because the prohibition lived in files the model read at dispatch time (`sai/commands/commit/worker.md`, `sai/commands/archive/worker.md`, `sai/commands/explore/direct-build-worker.md`). Prose placement reduced frequency but never removed the possibility. The no-commit guard turns the one invariant that is true in every project — HEAD immobility across a dispatch — into a deterministic filesystem check that runs at the moment of action, with automatic remediation that preserves content and lets the route continue.

## What Changes

- A new deterministic Node tool, `sai/tools/no-commit-guard.js`, with `snapshot` and `verify` sub-commands emitting closed JSON verdicts (`clean | violation | allowed | n/a`) and exit codes 0/1/2. HEAD-only and project-agnostic: no path knowledge, no project configuration, no scope lists. On a violation the verify payload carries the commit evidence (`git log <base>..HEAD`) because the reset erases it.
- A new single-source policy, `sai/policies/no-commit-guard.md`, defining the one rule (HEAD identical immediately before and after every routed worker dispatch window), window pairing, batch semantics, replacement-worker semantics, `guard_base` conversation state, the `allow_commit` lax flag, verdict handling, and the remediation order: capture evidence first, `git reset <guard_base>` (mixed), one pinned incident line, continue the route.
- `sai/policies/autonomy-audit-log.md` gains the pinned `## Incident line (no-commit guard)` section: one visible conversation-only line per violation, never persisted.
- Thirteen coordinator cards that dispatch a routed worker binding — spec, design, implement, apply, review, security, performance, accessibility, commit, archive, backfill, merge, meta-review — gain a No-commit guard section pairing snapshot and verify around every dispatch and same-worker continuation. Coordinator-owned mutations (apply commit gates, the merge launch, the archive commit gate, backfill staging) always run between windows and never inside one.
- `sai/commands/explore/steps/pipeline-direct-build.md` gains three guard windows for the Direct Build (unattended) run; the implementer window's snapshot head is recorded as both `base_sha` and `guard_base`; the Step 8 archive execute continuation's verify runs with `--allow-commit`, the system's only carrier.
- A new test suite, `test/no-commit-guard-tool.test.js`, covers the tool verdicts, evidence ordering, usage errors, policy single-sourcing, incident-line pinning, and per-card guard wiring. `AGENTS.md` documents the convention and registers the tool.

## Capabilities

### New Capabilities

- `no-commit-guard`: the deterministic HEAD-immobility tool, its closed verdict vocabulary, window pairing, batch semantics, guard state, remediation order, and coordinator-card integration.

### Modified Capabilities

- `safe-operations-skill`: the pre-authorized remediation reset is carved out of the destructive-operation confirmation gate (that one mixed reset only).
- `pipeline-autonomy-audit-log`: the guard's one visible violation line is pinned in the shared audit layout, conversation-only.
- `sai-tools-distribution`: `no-commit-guard.js` joins the registered deterministic tool roster; installed by the existing `sai-tools` projection with no manifest edit.
- `design-coordinator`, `implementation-coordinator`, `review-phase-coordinator`, `security-phase-coordinator`, `accessibility-phase-coordinator`: the guard's two tool invocations are each coordinator's only authorized git observations on the artifact-blind clean route.
- `apply-coordinator-ownership`: every RED, GREEN, and green-exception dispatch is a separate guard window; the two commit-authorization gates always run between windows.
- `routed-commit-command`: the authorized commit executes only after the verify of the result that carried the authorization ask.
- `routed-archive-command`: archive guard windows, with the Direct Build execute continuation as the single `allow_commit` carrier.
- `routed-backfill-command`: backfill guard windows are draft-write-only and never carry `allow_commit`.
- `sai-merge-command`: fresh snapshots before every continuation keep coordinator mutations outside every window.
- `concurrent-audit-dispatch`: the concurrent audit batch is one guard window (snapshot at batch start, verify at batch close).
- `explore-pipeline-supervision`: the Direct Build run has three guard windows.
- `auto-fast-archive-execution`: the execute continuation's verify runs with `--allow-commit`.
- `auto-fast-implement-worker`: the implementer window snapshot head doubles as `base_sha`.

## Impact

- New files: `sai/tools/no-commit-guard.js`, `sai/policies/no-commit-guard.md`, `test/no-commit-guard-tool.test.js`
- Modified files: `AGENTS.md`, `sai/policies/autonomy-audit-log.md`, `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/apply/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/security/coordinator.md`, `sai/commands/performance/coordinator.md`, `sai/commands/accessibility/coordinator.md`, `sai/commands/commit/coordinator.md`, `sai/commands/archive/coordinator.md`, `sai/commands/backfill/coordinator.md`, `sai/commands/merge/coordinator.md`, `sai/commands/meta-review/coordinator.md`, `sai/commands/explore/steps/pipeline-direct-build.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
