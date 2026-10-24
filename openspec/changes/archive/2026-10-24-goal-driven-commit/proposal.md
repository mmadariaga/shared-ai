> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-commit` was the smallest command still kept on the legacy orchestration (`sai/adapters/{claude,opencode}/boot.md`, `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`). Moving it onto the goal-driven shape that `/sai-build` and `/sai-merge` already use proves that shape end to end on a command that keeps a user gate. The goal-driven cards also each restated the same obstacle-budget and escalation rules; one shared policy now holds those rules, so the later migrations can reuse it instead of `stop-options.md`, `bounded-recovery.md`, and `unattended-runtime-recovery.md`.

## What Changes

- Both `/sai-commit` wrappers (`commands/claude/sai-commit.md`, `commands/opencode/sai-commit.md`) load the harness fetch skill, carry the clean-start line, and fetch `sai/commands/commit/coordinator.md` directly. They no longer fetch a boot adapter or a command bootstrap. The opencode wrapper declares `subtask: false`.
- `sai/commands/commit/command-bootstrap.md` is deleted, and `sai/install-manifest.json` lists it as a retired destination so an upgrade install removes it from both harness roots.
- Both boot adapters drop `commit` from their routed names; only `archive` and `backfill` stay routed.
- `sai/commands/commit/coordinator.md` is rewritten as a goal-driven card (Goal, Start, The run, Obstacles, Close). It creates the worker through the commit-worker binding, keeps the no-commit guard windows, presents the worker questions through the native picker, and alone runs `commit.js apply` after an authorizing answer. It no longer declares phase-adapter fields or keeps an opaque input history; a replacement worker receives a hand-over that the coordinator writes. Obstacles (a worker without ready or a readable result, a failing `commit.js` call) follow the shared obstacle policy, while the authorization question, the confirmations, a declined answer, and validation violations stay planned stops.
- `sai/commands/commit/worker.md` no longer loads `worker-core.md`. It returns `event: ready` on creation, then a `needs_input` or a `completed`/`failed`/`cancelled` result as its final message, and dispatches no subagent.
- `bin/worker-matrix.js` adds `commit` to `STANDALONE_PHASES`, so the commit binding renders from `standalone-worker-template.md` on both harnesses.
- `sai/install-manifest.json` gives the `commit-command` capability profile the `safe-operations` skill.
- New `sai/policies/obstacle-escalation.md` holds the shared obstacle rules: the budget of 3 attempts, the approaches, planned stops, force majeure, the stop report and options of an escalation, the answer handling, and the authority limit of options.
- The goal-driven cards of `/sai-3-implement`, `/sai-4-review`, `/sai-merge`, the audit coordinator, and the plan segment cycle (`sai/commands/plan/cycle.md`) load the new policy and keep only their own obstacle identifiers, approaches, and force-majeure cases. Their obstacle behavior is unchanged.
- `AGENTS.md` and `docs/sequential-pipeline.md` describe `/sai-commit` on the goal-driven shape and the new policy. Tests and the thin-wrapper baseline fixture follow the new wrapper and card shapes, and `test/commit-goal-driven.test.js` covers the migration.

## Capabilities

### New Capabilities

- `obstacle-escalation`: one shared policy for stopping on an obstacle with recovery options and escalating to the user, loaded by the goal-driven cards.

### Modified Capabilities

- `routed-commit-command`: `/sai-commit` runs on the goal-driven shape (direct wrapper, goal-driven coordinator card, standalone worker binding) with its authorization gate and terminal literal unchanged.
- `worker-matrix-collapse`: the commit binding renders from the standalone worker template.
- `sai-merge-command`: the merge coordinator also loads the obstacle policy.
- `review-new-command`: the review coordinator also loads the obstacle policy.
- `unattended-audit-coordinator`: the audit coordinator also loads the obstacle policy.
- `implement-new-loop`: the implement coordinator also loads the obstacle policy.
- `plan-spec-design-segments`: the shared plan cycle that the spec and design coordinators load now loads the obstacle policy.

## Impact

- New files: `sai/policies/obstacle-escalation.md`, `test/commit-goal-driven.test.js`.
- Deleted files: `sai/commands/commit/command-bootstrap.md`.
- Modified files: `commands/claude/sai-commit.md`, `commands/opencode/sai-commit.md`, `sai/commands/commit/coordinator.md`, `sai/commands/commit/worker.md`, `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `bin/worker-matrix.js`, `sai/install-manifest.json`, `sai/commands/audit/coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/merge/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/review/coordinator.md`, `AGENTS.md`, `docs/sequential-pipeline.md`, `fixtures/thin-command-wrappers-baseline.json`, and the affected tests under `test/`.
- No legacy surface is deleted: `boot.md`, `command-runner.md`, `worker-core.md`, `stop-options.md`, `bounded-recovery.md`, and `unattended-runtime-recovery.md` stay for their remaining consumers.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

In this slice, I1 applies to the `/sai-commit` wrapper only; the other wrappers move in later slices.
