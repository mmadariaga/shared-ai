> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The global gate added for #504 (commit `ae44d3bc`) made every Claude Code continuation wait for the subagent's `completed` notification. It traded a rare lost task with a `haiku` worker for an unattended run that sits idle after a short `ready` turn until the user writes (#514). An optimistic send keeps the normal path free of waits whatever the harness cause, and the wait moves to the only path that needs it: a continuation that the subagent rejected.

## What Changes

- `sai/policies/worker-lifecycle.md` gains `## Continuation timing`, the single source of the Claude Code continuation timing: the terms handback, optimistic send, and rejected continuation; each continuation goes with `SendMessage` as soon as the handback arrives; a reply that repeats the previous handback (`event: ready` again, or a report reference already accepted) is a rejected continuation, resent once after the matching `completed` notification (at once when it has already arrived); a second rejection is an obstacle of the current step, and a helper rejected twice is a failed helper dispatch; a repeated reference that answers a sent message is a rejection, not a duplicate; no timer or wake process is added; a stop call at a dispose point never waits; opencode as the main harness and opencode-routed agents keep continuing only after the turn has ended.
- `sai/orchestration/workers/bindings/claude/standalone-worker-template.md` § Continue, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, and `skills/claude/budget-subagent/SKILL.md` § Dispatch mode, and the Claude Code part of the explorer two-phase startup in `sai/commands/explore/body.md` replace the completed-notification gate with a pointer to `worker-lifecycle.md` § Continuation timing. The budget skills now await the handback, not the completion notification.
- `sai/adapters/claude/panel-render.md` § Order sends the progress-event `SendMessage` in the same turn as its panel updates again.
- `sai/commands/implement/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/audit/coordinator.md`, and `sai/commands/plan/cycle.md` keep "after the worker's completion notification has arrived" for opencode only and point to § Continuation timing for Claude Code.
- `sai/policies/worker-report-transport.md` § Undelivered reports: the **Duplicate** rule names its exception, a repeated reference that answers a message the coordinator sent is a rejected continuation.
- `test/claude-continuation-timing.test.js` checks the single sourcing: `worker-lifecycle.md` holds one § Continuation timing with its rules, each Claude Code site points to it without restating the gate, the coordinators keep the wait for opencode only, the transport names the exception, and the opencode dispatch sources keep their rule.

The opencode dispatch sources (`sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `skills/opencode/budget-*/SKILL.md`, `sai/policies/opencode-dispatch.md`), the worker contracts, and the ready prompt are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `claude-continuation-timing`: Claude Code continuations use an optimistic send; a rejected continuation is resent once after its `completed` notification; the timing is stated once in `sai/policies/worker-lifecycle.md` § Continuation timing; the global completed-notification gate is removed.
- `dispatch-safety-invariant`: the Claude Code `## Dispatch mode` declaration awaits the handback and points to § Continuation timing instead of stating the completed-notification gate.
- `explore-two-phase-startup`: Claude Code explorer continuations go on the handback and wait for the explorer's `completed` notification only to resend a rejected continuation.
- `harness-panel-render-binding`: the Claude Code progress-event `SendMessage` shares the panel-update turn again.
- `non-blocking-runtime-panel-tool-degradation`: the progress-event exception issues panel updates and continuation in one turn on both harnesses.
- `todo-list-progress-rendering`: the Claude Code continuation no longer waits for the worker's `completed` notification after a progress event.
- `worker-dispatch-prompt-template`: Claude binding continuations follow § Continuation timing.
- `opencode-subagent-calls`: the Claude Code template's continuation timing is that of § Continuation timing.
- `undelivered-report-recovery`: a repeated reference that answers a sent message is a rejected continuation, not a duplicate.
- `worker-lifecycle-protocol`: the Claude Code continuation timing joins the mechanics defined once in `sai/policies/worker-lifecycle.md`.

## Impact

New files:

- `test/claude-continuation-timing.test.js`

Modified files:

- `sai/policies/worker-lifecycle.md`
- `sai/policies/worker-report-transport.md`
- `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`
- `skills/claude/budget-explorer/SKILL.md`
- `skills/claude/budget-executor/SKILL.md`
- `skills/claude/budget-subagent/SKILL.md`
- `sai/commands/explore/body.md`
- `sai/adapters/claude/panel-render.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/audit/coordinator.md`
- `sai/commands/plan/cycle.md`

Known limitations: the rare rejection path still waits for a `completed` notification, and for a `ready` or a helper reply nothing else wakes the coordinator, so that path can still stall; no new wake process was added. Claude Code and opencode now follow different continuation timing.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The four coordinators of I4 have carried the completed-notification wait on Claude Code since 2026-11-04 (commit `a68eda3`) with no reported stall, so the gate alone may not explain #514; the stall may also depend on how Direct Build chains its steps. The optimistic send does not depend on that cause. Reporting the harness behavior to Claude Code (issue Q4) can be filed separately.
