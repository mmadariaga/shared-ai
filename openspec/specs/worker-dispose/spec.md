# worker-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Dispose is a dispatcher action

Dispose SHALL be the unconditional action of a dispatcher that ends a worker or helper it created, on the handle it captured at dispatch, without a model turn, whatever the warming setting and whatever the agent's latest `warming` diagnostic. `sai/policies/worker-lifecycle.md` SHALL be the single source of the dispose points, the stop call, and the dispose outcomes; `sai/policies/cache-warming.md` SHALL point to it and its `warming` diagnostic SHALL gate no stop: the stop call SHALL always run, and the diagnostic SHALL decide only whether the opencode `dispose` message follows a `none` listing. The stop call SHALL be, on Claude Code, `TaskStop(task_id: <captured agent ID>)`; on opencode, `node <tool-path> --session <sessionID> --cwd <project-root>` of `sai/tools/dispose-shells.js`, resolved per `sai/policies/tool-resolution.md`, with the captured `sessionID`, which removes every running shell of that session. `removed` SHALL be a complete dispose with no notice. Because a warming worker can sit between a wait's exit and its re-arm, `none` SHALL end nothing for it: on opencode the dispatcher SHALL keep, with each worker's handle, the `warming:` line of that worker's last real message, and when the tool reports `none` it SHALL send the message `dispose` only when that line was `warming: true`; a worker that never sent the line (for example one that only answered the ready handshake) or whose last line was `warming: false` SHALL receive no message, and that dispose SHALL be complete with no notice. When the tool reports `failed` or `unavailable`, the dispatcher SHALL print a one-line notice and send the message `dispose`. The stop call SHALL include no `session.interrupt`, neither harness SHALL send the `dispose` message before the stop call, and Claude Code SHALL never send it. One dispose SHALL also end the cache-warm wait the agent armed, with no second stop action. A dispose that finds the agent already finished or no longer existing SHALL count as success: it SHALL NOT be an obstacle, SHALL spend no attempt, and SHALL NOT be retried. Handles, and the last `warming:` line kept with each, SHALL live in conversation state only, never in the `sai-state` store; a handle lost to a context compaction SHALL be skipped, and the run outcome SHALL NOT change. Any other dispose failure (a permission refusal, a failed `TaskStop`, the `dispose` fallback itself) SHALL print one notice naming the worker role and the error, and the run SHALL continue to its close and keep its outcome. Claude Code and opencode SHALL dispose at the same points and differ only in the stop call.

#### Scenario: Claude Code dispose
- **WHEN** a Claude Code coordinator disposes a worker, whatever its latest `warming` diagnostic
- **THEN** it calls `TaskStop` with the worker's captured agent ID, which also ends the worker's armed wait, and sends no `dispose` message

#### Scenario: opencode API unreachable
- **WHEN** an opencode coordinator disposes a worker and `dispose-shells.js` reports `unavailable` or `failed`
- **THEN** it prints a one-line notice and sends the message `dispose` to the worker instead, and the worker answers each later wake with `ok` and arms nothing

#### Scenario: Disposing a finished agent
- **WHEN** a dispatcher reaches a dispose point for an agent that already finished or no longer exists
- **THEN** the stop counts as disposed, spends no attempt, and is not retried

#### Scenario: Window expired before the dispose
- **WHEN** a dispatcher disposes an agent whose armed wait already ended because the `max` window expired
- **THEN** the result is not an obstacle, spends no attempt, and is not retried

#### Scenario: Warming off still disposes
- **WHEN** the warming setting is `off` and a coordinator reaches a dispose point for a worker whose latest message declared `warming: false`
- **THEN** the coordinator still ends the worker with the harness stop call, and on opencode a `none` listing sends no `dispose` message

#### Scenario: Dispose failure keeps the run outcome
- **WHEN** a dispose fails for a reason other than the worker having already ended
- **THEN** the coordinator prints one notice naming the worker role and the error and the run continues to its close with its outcome unchanged

#### Scenario: Lost handle is skipped
- **WHEN** a context compaction lost the handle of a worker before its dispose point
- **THEN** the coordinator disposes the workers whose handles it still holds and the run outcome does not change

#### Scenario: opencode dispose removes the worker's shells
- **WHEN** an opencode coordinator disposes a worker and `dispose-shells.js` reports `removed`, or reports `none` for a worker whose last real message did not carry `warming: true`
- **THEN** the dispose is complete, no notice is printed, and no `dispose` message is sent

#### Scenario: none listing for a warming worker
- **WHEN** an opencode coordinator disposes a worker whose last real message carried `warming: true` and `dispose-shells.js` reports `none`
- **THEN** the coordinator sends the message `dispose` with no notice, and the worker replies `ok` and answers each later wake with `ok` and arms nothing

#### Scenario: Worker that only answered the ready handshake
- **WHEN** an opencode coordinator disposes a worker that never sent a `warming:` line and `dispose-shells.js` reports `none`
- **THEN** the coordinator sends no `dispose` message and the dispose is complete

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

### Requirement: opencode shell removal tool

`sai/tools/dispose-shells.js` SHALL take `--session <sessionID> --cwd <project-root>`, list the shells of the project directory with `opencode api GET "/api/shell?location[directory]=<URL-encoded project root>"`, keep the running shells whose `metadata.sessionID` equals the given session, remove each with `opencode api DELETE "/api/shell/<id>?location[directory]=<URL-encoded project root>"`, list again, and print one JSON object `{status, removed, failed}`. It SHALL always use the raw method-and-path form with the directory in the query, never the `--param` form, which the server ignores. A shell SHALL count as removed only when the second listing no longer shows it. It SHALL remove no shell of any other session. `status` SHALL be `removed` when every running shell of the session was removed, `none` when the session had no running shell, `failed` when a shell is still listed after its removal, and `unavailable` when the `opencode` CLI is absent or the server did not answer a listing. It SHALL exit 0 for `removed` and `none`, 1 for `failed` and `unavailable`, and 2 for a usage error (a session id that is not a plain identifier, or a missing `--cwd`). The existing `sai-tools` projection SHALL install it with no new shell grant, and `sai/policies/tool-resolution.md` SHALL list it among the resolvable tools. Its tests SHALL stub the `opencode` CLI.

#### Scenario: Worker with running shells
- **WHEN** the tool runs for a session that has running shells, its armed cache-warm wait included
- **THEN** it removes each of them, the second listing no longer shows them, and it prints `removed` with their ids

#### Scenario: Worker with no running shell
- **WHEN** the tool runs for a session that has no running shell
- **THEN** it removes nothing and prints `none` with exit 0

#### Scenario: Shell still listed after removal
- **WHEN** a removed shell still appears in the second listing
- **THEN** the tool prints `failed` with that shell's id and exits 1

#### Scenario: Server unreachable
- **WHEN** the `opencode` CLI is absent or the server does not answer the listing
- **THEN** the tool prints `unavailable` and exits 1

#### Scenario: Shell of another session
- **WHEN** the listing holds running shells of other sessions
- **THEN** the tool leaves them running
