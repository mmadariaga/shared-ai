# worker-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Dispose is a dispatcher action

Dispose SHALL be the unconditional action of a dispatcher that ends a worker or helper it created, on the handle it captured at dispatch, without a model turn, whatever the warming setting and whatever the agent's latest `warming` declaration. `sai/policies/worker-lifecycle.md` SHALL be the single source of the dispose points, the stop call, and the dispose outcomes; `sai/policies/cache-warming.md` SHALL point to it and its `warming` field SHALL gate no stop. The stop call SHALL be, on Claude Code, `TaskStop(task_id: <captured agent ID>)`; on opencode, `shell.remove` of the outstanding shell of the agent's session followed by `session.interrupt` of that session with the captured `sessionID`. When the opencode session API is not reachable, the dispatcher SHALL send the message `dispose`. One dispose SHALL also end the cache-warm wait the agent armed, with no second stop action. A dispose that finds the agent already finished or no longer existing SHALL count as success: it SHALL NOT be an obstacle, SHALL spend no attempt, and SHALL NOT be retried. Handles SHALL live in conversation state only, never in the `sai-state` store; a handle lost to a context compaction SHALL be skipped, and the run outcome SHALL NOT change. Any other dispose failure (a permission refusal, an unreachable opencode API) SHALL print one notice naming the worker role and the error, and the run SHALL continue to its close and keep its outcome. Claude Code and opencode SHALL dispose at the same points and differ only in the stop call.

#### Scenario: Claude Code dispose
- **WHEN** a Claude Code coordinator disposes a worker, whatever its latest `warming` declaration
- **THEN** it calls `TaskStop` with the worker's captured agent ID

#### Scenario: opencode API unreachable
- **WHEN** an opencode coordinator disposes a worker and cannot reach the session API from its session
- **THEN** it sends the message `dispose` to the worker instead

#### Scenario: Disposing a finished agent
- **WHEN** a dispatcher reaches a dispose point for an agent that already finished or no longer exists
- **THEN** the stop counts as disposed, spends no attempt, and is not retried

#### Scenario: Window expired before the dispose
- **WHEN** a dispatcher disposes an agent whose armed wait already ended because the `max` window expired
- **THEN** the result is not an obstacle, spends no attempt, and is not retried

#### Scenario: Warming off still disposes
- **WHEN** the warming setting is `off` and a coordinator reaches a dispose point for a worker whose latest message declared `warming: false`
- **THEN** the coordinator still ends the worker with the harness stop call

#### Scenario: Dispose failure keeps the run outcome
- **WHEN** a dispose fails for a reason other than the worker having already ended
- **THEN** the coordinator prints one notice naming the worker role and the error and the run continues to its close with its outcome unchanged

#### Scenario: Lost handle is skipped
- **WHEN** a context compaction lost the handle of a worker before its dispose point
- **THEN** the coordinator disposes the workers whose handles it still holds and the run outcome does not change

### Requirement: Coordinators dispose workers at close points

Coordinators SHALL dispose every worker they create, under `sai/policies/worker-lifecycle.md` and independent of the `warming` declaration, at its last use (the point after which the coordinator sends no further message to it), when a new worker replaces it (before the replacement receives its first message; a later message from the old worker SHALL NOT be processed as a result), when the user stops the run, abandons the route, or dismisses a question the worker was waiting on (before any run or slice state is reset), and at run close before the `close` event or the closing report, in every outcome. A segment that ends inside a chain of segments SHALL be a close of its own, so its workers are disposed before the next segment starts. A worker paused on a pending `needs_input` question SHALL NOT be disposed until the answer reaches it as a continuation. Each coordinator card (implement, review, audit, spec, design, build, deep-review, merge, commit, archive, backfill, plan and its cycle, the explore Direct Build coordinator, the explore POC lane, the explore slice handling, and the explore body) SHALL state its own dispose points citing `worker-lifecycle.md`, and SHALL still resolve each worker's warming timings at every message to it under `cache-warming.md`. An executor SHALL be disposed after its result.

#### Scenario: Segment boundary in a composite run
- **WHEN** a `/sai-build` segment ends, in any outcome, and the next segment is about to start
- **THEN** the finished segment's workers are disposed before the next segment starts, whatever their `warming` declaration

#### Scenario: Pending question keeps the worker armed
- **WHEN** a worker returns `needs_input` and the coordinator escalates the question to the user
- **THEN** the coordinator does not dispose the worker until the answer is forwarded, and disposes it when the user dismisses the question or stops the run

#### Scenario: Implement close
- **WHEN** `/sai-3-implement` reaches Close step 7, in any outcome
- **THEN** the coordinator disposes the RED and GREEN workers and the live explorer before emitting the `close` event

#### Scenario: Direct Build worker hand-offs
- **WHEN** the explore Direct Build route finishes Step 5, Step 6, and Step 8
- **THEN** the coordinator disposes the implementer when Step 5 ends, the backfill worker when Step 6 completes, the archive worker when Step 8 completes, and each executor after its result

#### Scenario: Direct Build close after a reported stop
- **WHEN** the explore Direct Build route closes because a stop was reported and the slice is parked
- **THEN** the coordinator disposes every worker and helper still alive before the Close report

#### Scenario: Direct Build fix-loop explorers
- **WHEN** the explore Direct Build route dispatched explorers in its Step 2 functional fix loop
- **THEN** the coordinator disposes each of them at the latest when Step 2 converges, or at Close in every outcome

#### Scenario: Audit worker result is its last use
- **WHEN** an audit worker returns its `completed` or `failed` result
- **THEN** the audit coordinator disposes the worker before it verifies the report or commits

#### Scenario: Abandon of a running explore route
- **WHEN** the user abandons or stops a running explore route
- **THEN** the coordinator disposes every worker still alive for it before the slice is parked

#### Scenario: New invocation discards a parked Direct Build slice
- **WHEN** a new `/sai-explore` invocation finds live workers of a parked Direct Build slice in the chat
- **THEN** it disposes them before the slice state is reset

#### Scenario: POC implementer last use
- **WHEN** the explore POC lane reaches the end of its Step 2, or exits earlier
- **THEN** the coordinator disposes the POC implementer before the destroy question can remove the worktree it works in

#### Scenario: Replacement disposes the old worker first
- **WHEN** a coordinator replaces a worker with a new worker
- **THEN** it disposes the old worker before the replacement receives its first message and does not process a later message from the old worker as a result
