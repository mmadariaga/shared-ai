> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On Claude Code, disposing an already-completed subagent with `TaskStop` shows a visible `Task ... is not running (status: completed)` error on every dispose while warming is off, although `sai/policies/cache-warming.md` described that case as a silent no-op. The dispatcher inferred what might be armed instead of observing it, so every unconditional dispose of a finished worker or helper surfaced that error in the default configuration.

## What Changes

- `sai/policies/cache-warming.md` gains a `## Warming declaration` section and becomes the single source of the `warming: true|false` field, the `warm-up` order, and the rule that a dispatcher disposes only a handle whose latest real message declared `warming: true`. A message without the field, a lost value, the `ready` reply, and every message while the setting is `off` count as `false`; a failed arm declares `false`; a final response declares `false`. The `ok` of a wake or a `dispose` is not a real message. The dispatcher keeps the latest value in conversation state only, never in the `sai-state` store.
- The Dispose section drops the "silent no-op" wording: a handle declared `false` (or undeclared) gets no stop call, no shell removal, and no `dispose` message, and a dispose after `true` that finds nothing left to stop (the `max` window expired) is expected, is not an obstacle, spends no attempt, and is not retried.
- Helpers change: a helper task or continuation carries no warming line; the only order that makes a helper arm is `warm-up`, sent only to a `budget-explorer` or `budget-subagent` the dispatcher will reuse, never to a `budget-executor` or a worker. The executor never arms and is never disposed.
- The Claude Code and opencode standalone worker binding templates state that every real worker message declares `warming: true|false` (beside the report path when the worker returns only a path) and that the coordinator disposes the worker only when its latest message declared `warming: true`.
- Helper output contracts add the field: `sai/policies/explore-agent.md` makes `warming` a third always-present field and recognizes the `warm-up` order; `sai/policies/executor-agent.md` and `sai/policies/budget-agent.md` end every report with `warming: false`, and the task subagent answers a `warm-up` with the declaration line alone.
- The six budget skills (`skills/claude/budget-*/SKILL.md`, `skills/opencode/budget-*/SKILL.md`) replace the unconditional dispose with dispose-only-after-`warming: true`; the explorer and subagent skills describe `warm-up` before reuse; the executor skills state that nothing is disposed.
- Coordinator cards (audit, review, plan cycle, implement, explore Direct Build, explore body) keep their dispose points and point to the policy's Dispose rule; the implement and Direct Build cards stop disposing executors.
- Report-path workers (implement, plan, merge worker contracts, and the Direct Build report transport) return the warming line beside the report path or reference, never inside the report file.
- Scope drift (not an implementation error): `AGENTS.md` and `docs/project-settings.md` describe the warming declaration and dispose-only-after-`true`. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): `test/cache-warmer.test.js` adds guards for the policy declaration, the helper contracts, the budget skills, and both binding templates; `test/implement-family.test.js`, `test/merge-goal-driven.test.js`, and `test/plan-family.test.js` follow the new report-path wording. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `subagent-warming-declaration`: every real subagent message declares whether its cache-warming wait is armed, and the dispatcher keeps that value per handle.

### Modified Capabilities

- `agent-self-warming`: the policy owns the warming field and `warm-up`; only workers receive the warming line on task messages; a failed arm declares `warming: false`; a wake `ok` is not a real message.
- `worker-dispose`: dispose happens only after a `warming: true` declaration, on Claude Code and opencode, and a dispose that finds nothing left after `true` is harmless.
- `helper-dispose`: the executor never arms and is never disposed; a task subagent is disposed only after a `warm-up` armed it; `warm-up` before reuse.
- `live-explorer`: explorer tasks carry no warming line, a reused explorer may receive `warm-up`, and only explorers that declared `warming: true` are disposed.
- `direct-build-report-transport`: the warming line travels beside the report reference.
- `implement-new-workers`, `plan-segment-cycle`, `merge-worker-discipline`, `merge-resolution-transport`: report-path workers return the warming line beside the path.

## Impact

Modified files:

- `sai/policies/cache-warming.md`
- `sai/policies/explore-agent.md`
- `sai/policies/executor-agent.md`
- `sai/policies/budget-agent.md`
- `sai/policies/direct-build-report-transport.md`
- `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`
- `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`
- `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`
- `sai/commands/audit/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/plan/worker-common.md`
- `sai/commands/implement/coordinator.md`, `sai/commands/implement/worker-common.md`
- `sai/commands/merge/worker.md`, `sai/commands/merge/steps/common.md`
- `sai/commands/explore/body.md`, `sai/commands/explore/direct-build-coordinator.md`
- `AGENTS.md`, `docs/project-settings.md`
- `test/cache-warmer.test.js`, `test/implement-family.test.js`, `test/merge-goal-driven.test.js`, `test/plan-family.test.js`

New files: none.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
