> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

With warming off (the default), no SAI coordinator ever stopped a worker, because the only stop rule (`sai/policies/cache-warming.md` § Dispose) was gated on the worker's latest `warming: true` declaration. A Direct Build worker stayed alive for more than 50 minutes on a hung shell command, and the dispose rules contradicted each other across coordinators (the Direct Build coordinator disposed the implementer after Step 2b while Step 5 still continued it; the review coordinator carried both a gated and an ungated rule). Ending a worker had become a side effect of cache warming instead of a part of the worker lifecycle.

## What Changes

- New policy `sai/policies/worker-lifecycle.md` is the single source of disposal. It defines `dispose` as the unconditional action that ends a worker or helper the coordinator created, whatever the warming setting and the worker's latest `warming` declaration, at four points: last use, replacement (before the replacement receives its first message), abandon or stop (before any run or slice state is reset), and close (before the `close` event or the closing report, in every outcome; a segment close inside a chain of segments is a close of its own). A worker with a pending `needs_input` question has not reached its last use.
- The policy defines the per-harness stop call (Claude Code `TaskStop` with the captured agent ID; opencode `shell.remove` then `session.interrupt` with the captured `sessionID`, and the `dispose` message when the API is unreachable), states that one dispose also ends the worker's armed cache-warm wait, and defines the outcomes: an already-ended worker counts as disposed with no attempt and no retry, a handle lost to a context compaction is skipped, and any other failure prints one notice naming the worker role and the error while the run keeps its outcome. Handles stay in conversation state only.
- Helpers follow the same rule: a one-shot helper (`budget-subagent`, `budget-executor`) is disposed after its result; a live explorer is not disposed between searches and is disposed at route end, on abandon or stop, and at run close.
- A "Worker side" section adds shell hygiene: a worker or helper sends no result, step report, or question while a command it launched is still running; it awaits or ends each background command first, and reports a non-terminating command it ended as a failed command in that same message. The cache-warm wait armed after a response is exempt. A message that is exactly `dispose` is answered with `ok`, with no tool run and no new arm.
- `sai/policies/cache-warming.md` loses its § Dispose rules and keeps arming, waking, the window, the warming declaration, `warm-up`, and the hand-off wait; it points to `worker-lifecycle.md`, and the `warming` field gates no stop. Its "Stop your own wait" now disposes every worker and helper still alive under `worker-lifecycle.md`.
- Every coordinator states its own dispose points citing `worker-lifecycle.md`: archive, audit (worker disposed on its `completed` or `failed` result, before verify and commit), backfill (after the last `materialize`), build and deep-review (per segment, in every outcome), commit (after the executed commit), design, spec, plan and its cycle (at segment close, on replacement, at run close), implement (RED, GREEN, and the live explorer at Close step 7, in every outcome), merge (after Finalize, and any still-alive worker at close), and review (one ungated rule).
- Explore: the Direct Build coordinator disposes the implementer when Step 5 ends (instead of after Step 2b), the backfill worker when Step 6 completes, the archive worker when Step 8 completes, each executor after its result, each explorer of the Step 2 functional fix loop when Step 2 converges or at Close, and every worker and helper still alive before the Close report in every outcome, including a reported stop that parks the slice. The POC implementer is disposed at the end of its Step 2, or on an earlier lane exit before the destroy question can remove its worktree. An abandon or stop of a running route disposes every worker still alive before the slice is parked, and a new `/sai-explore` invocation disposes the live workers of a parked Direct Build slice before the slice state is reset. Explore explorers are disposed at route end, abandon or stop, and invocation close, whatever the warming setting.
- Both standalone worker binding templates (`sai/orchestration/workers/bindings/{claude,opencode}/standalone-worker-template.md`) fetch `worker-lifecycle.md` and drop the warming gate from "Warm and dispose". The `agents/{claude,opencode}/worker-template.md` and `budget-subagent` agent files fetch `worker-lifecycle.md` § Worker side. The budget executor, explorer, and subagent skills on both harnesses fetch `worker-lifecycle.md` and state the unconditional dispose. The shell rule of `sai/policies/executor-agent.md` points to § Worker side.
- `AGENTS.md`, `docs/project-settings.md`, and the affected tests are updated to match.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `worker-dispose`: dispose is unconditional, defined by `worker-lifecycle.md`, at last use, replacement, abandon or stop, and close, with already-ended, lost-handle, and failure outcomes.
- `helper-dispose`: one-shot helpers, the executor included, are disposed after their result whatever their `warming` declaration.
- `worker-lifecycle-protocol`: `worker-lifecycle.md` owns disposal while `cache-warming.md` owns warming; resumable workers are disposed at the lifecycle points; workers keep no launched command running when they send a message.
- `live-explorer`: a reused explorer stays alive between searches and is disposed at route end, abandon or stop, and run close without a warming condition.
- `agent-self-warming`: `cache-warming.md` no longer owns disposing and points to `worker-lifecycle.md`; its "Stop your own wait" disposes every worker and helper still alive.
- `opencode-subagent-calls`: the opencode shell removal and session interrupt apply to every disposed worker, whatever its `warming` declaration.
- `nonterminal-result-transport`: the worker-side rule covers results, step reports, and questions, reports a hung command it ended as failed, and exempts the cache-warm wait.

## Impact

- New: `sai/policies/worker-lifecycle.md`.
- Modified policies and templates: `sai/policies/cache-warming.md`, `sai/policies/executor-agent.md`, `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `agents/claude/worker-template.md`, `agents/opencode/worker-template.md`, `agents/claude/budget-subagent.md`, `agents/opencode/budget-subagent.md`.
- Modified coordinators: `sai/commands/{archive,audit,backfill,build,commit,deep-review,design,implement,merge,plan,review,spec}/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/explore/body.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/poc-lane.md`, `sai/commands/explore/steps/slice.md`.
- Modified skills: `skills/{claude,opencode}/budget-executor/SKILL.md`, `skills/{claude,opencode}/budget-explorer/SKILL.md`, `skills/{claude,opencode}/budget-subagent/SKILL.md`.
- Modified docs: `AGENTS.md`, `docs/project-settings.md`.
- Modified tests: `test/cache-warmer.test.js`, `test/claude-default-preset-alignment.test.js`, `test/executor-single-final-report.test.js`, `test/implementation-harness-bindings-step-2.test.js`, `test/uninstall-enumeration.test.js`.
- Known limitations: a handle lost to a context compaction is not disposed, because handles stay in conversation state; every coordinator and worker template loads one more policy file; whether an idle opencode child session with an open background shell ends by itself stays unverified, and the opencode stop sequence is unchanged.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Agreed last-use points per coordinator: Direct Build implementer after Step 5, backfill worker after Step 6, archive worker after Step 8 or Close; POC implementer after its Step 2; implement RED, GREEN, and live explorer at Close step 7; review worker at Close; audit worker after its completed result, before verify and commit; spec, design, plan, build, and deep-review segment workers at segment close; merge worker after Finalize; commit worker after the executed commit; archive worker and its correction backfill worker after the executed archive; backfill worker after the execute order. Undecided: whether an idle opencode child session with an open background shell ends by itself (affects I9). ADR 0202 pins warming-gated disposal of the live explorer, so the change likely needs a new ADR that amends it.
