> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-archive` and `/sai-backfill` were the last commands still loaded through the legacy orchestration (the boot adapters, `sai/orchestration/command-runner.md`, and phase-adapter coordinator cards). Direct Build calls both commands in its prepare and execute modes, so they must reach the goal-driven shape before Direct Build itself can move. Both now run on the same shape as `/sai-commit`, reuse the shared obstacle and escalation policy, and keep their user-visible behavior, including the backfill interview and the `--fast-track` gates, which the fast-track policy now scopes to these two commands.

## What Changes

- The `/sai-archive` and `/sai-backfill` wrappers on both harnesses (`commands/{claude,opencode}/sai-archive.md`, `commands/{claude,opencode}/sai-backfill.md`) load the harness fetch skill, carry the clean-start line, and fetch `sai/commands/{archive,backfill}/coordinator.md` directly. They no longer fetch a boot adapter or a command bootstrap. The opencode wrappers declare `subtask: false`.
- `sai/commands/archive/command-bootstrap.md` and `sai/commands/backfill/command-bootstrap.md` are deleted, and `sai/install-manifest.json` lists both as retired destinations so an upgrade install removes them from both harness roots.
- Both boot adapters drop their routed names; they select only the utility body cards (`explore`, `retire-docs`, `status`, `worktree`).
- `sai/commands/archive/coordinator.md` is rewritten as a goal-driven card (Goal, Start, The run, Obstacles, Close). It keeps the `--fast-track` parse with its banner, the change-picker resolution, `fast_track_active` as session state beside the worker task, the no-commit guard windows with the single `allow_commit` Direct Build execute window, the ordinary-route retirement declaration, CLI archive, once-per-run header-fix reroute, and post-archive commit gate, and the Direct Build prepare and execute route. It creates the worker through the archive-worker binding itself. A worker without ready or a readable result is a `worker` obstacle under the shared obstacle policy; the CORE stop, retirement refusals, CLI archive stops, commit-gate questions, and change-picker stops stay planned stops. A replacement worker receives a hand-over written by the coordinator. A failed Direct Build execute result stays with the Direct Build supervision contract (`sai/commands/explore/steps/pipeline-direct-build.md`).
- `sai/commands/backfill/coordinator.md` is rewritten as a goal-driven card with the same sections. It keeps the transfer directory, reference verification, schema validation, delta-header and scenario-preservation preflight, coordinator-side materialization, the Direct Build prepare and execute route, the guard windows, and the `Backfill complete in openspec/changes/{name}/.` literal with the `## Ready to Archive` block. A standalone run keeps its interview as user questions; an unattended envelope returns zero questions. Obstacles are named `worker` and `draft` under the shared obstacle policy; the interview, the worker's stop texts, transfer-directory blockers, preflight tooling failures, and the completion handoff stay planned stops or asks.
- `bin/worker-matrix.js` adds `archive` and `backfill` to `STANDALONE_PHASES`, so both bindings render from `standalone-worker-template.md` on both harnesses.
- `sai/install-manifest.json` gives the `archive-command` and `backfill-command` capability profiles the `safe-operations` skill.
- `sai/policies/fast-track-flag.md` gains a Scope section: the model governs `/sai-archive` and `/sai-backfill` only. The coordinator owns the parse and banner for `sai-archive`; `sai-explore` keeps its own parse outside the model; the backfill exception states that standalone backfill keeps its interview and that the flag skips exactly the generated reconciliation questions, the spec-conflict decision, and the change-name confirmation.
- `AGENTS.md` and `docs/sequential-pipeline.md` describe `/sai-archive` and `/sai-backfill` on the goal-driven shape. Tests and the thin-wrapper baseline fixture follow the new wrapper and card shapes, and `test/archive-backfill-goal-driven.test.js` covers the migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `routed-archive-command`: `/sai-archive` runs on the goal-driven shape (direct wrapper, goal-driven coordinator card, standalone worker binding) with its gates, fast-track behavior, Direct Build routes, and terminal literal unchanged.
- `routed-backfill-command`: `/sai-backfill` runs on the goal-driven shape with its interview, fast-track behavior, Direct Build routes, and completion handoff unchanged.
- `worker-matrix-collapse`: the archive and backfill bindings render from the standalone worker template.
- `obstacle-escalation`: the archive and backfill coordinators also load the shared obstacle policy.
- `sai-fast-track-flag`: the canonical fast-track policy is scoped to `/sai-archive` and `/sai-backfill`.
- `thin-wrappers`: the canonical archive wrapper example fetches the coordinator card directly.

## Impact

- New files: `test/archive-backfill-goal-driven.test.js`.
- Deleted files: `sai/commands/archive/command-bootstrap.md`, `sai/commands/backfill/command-bootstrap.md`.
- Modified files: `commands/claude/sai-archive.md`, `commands/claude/sai-backfill.md`, `commands/opencode/sai-archive.md`, `commands/opencode/sai-backfill.md`, `sai/commands/archive/coordinator.md`, `sai/commands/archive/instructions.md`, `sai/commands/backfill/coordinator.md`, `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `bin/worker-matrix.js`, `sai/install-manifest.json`, `sai/policies/fast-track-flag.md`, `AGENTS.md`, `docs/sequential-pipeline.md`, `fixtures/thin-command-wrappers-baseline.json`, and the affected tests under `test/`.
- No legacy surface is deleted: `boot.md`, `command-runner.md`, `worker-core.md`, `stop-options.md`, `bounded-recovery.md`, and `unattended-runtime-recovery.md` stay for their remaining consumers. The archive and backfill worker cards are unchanged.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

In this slice, I1 applies to the `/sai-archive` and `/sai-backfill` wrappers, and I6 applies only to the `fast-track-flag.md` scope; the explore part of I6 moves in the last slice.
