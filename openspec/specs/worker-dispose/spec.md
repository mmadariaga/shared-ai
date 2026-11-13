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

`sai/tools/dispose-shells.js` SHALL take one or more `--session <sessionID>` flags and one `--cwd <project-root>`, list the shells of the project directory with `opencode api GET "/api/shell?location[directory]=<URL-encoded project root>"`, keep the running shells whose `metadata.sessionID` equals a given session, remove each with `opencode api DELETE "/api/shell/<id>?location[directory]=<URL-encoded project root>"`, and list again. It SHALL always use the raw method-and-path form with the directory in the query, never the `--param` form, which the server ignores. A shell SHALL count as removed only when the second listing no longer shows it. It SHALL remove no shell of any session it was not given. A per-session `status` SHALL be `removed` when every running shell of the session was removed, `none` when the session had no running shell, `failed` when a shell is still listed after its removal or its removal was refused, and `unavailable` when the `opencode` CLI is absent or the server did not answer a listing.

With one `--session` the tool SHALL print one JSON object `{status, removed, failed, closed, close_failed}` and SHALL exit 0 for `removed` and `none` and 1 for `failed` and `unavailable`. With two or more `--session` flags it SHALL read the listing once to find the running shells, partition them by `metadata.sessionID` in the client, remove every target shell, verify with one more listing, and print the envelope `{status, results}`, where `results` holds one entry `{session, status, removed, failed, closed, close_failed}` per distinct session in the order given; the output shape SHALL follow the number of `--session` flags, so a session named twice yields one entry inside the envelope. The top `status` SHALL be the worst entry, in the order `unavailable` > `failed` > `removed` > `none`, and SHALL set the exit code as for a single session. A refused removal in one session SHALL NOT stop the removals of the other sessions, and each entry SHALL carry its own status.

The tool SHALL read each running shell's launch line from the listing's `command` field and SHALL split it into arguments with a quote-aware tokenizer (double and single quotes group one argument, and either path separator stays literal). A shell whose arguments hold one whose base name is `wait.js`, followed by `warm`, SHALL be a cache-warm shell; its chain id SHALL be the value of `--chain <id>`, or the `chain` of the state that the `--state <token>` value decodes to through the decoder `wait.js` exports. After the removal, and whatever its outcome, the tool SHALL close each distinct chain of a session's removed cache-warm shells once, through the `closeChain` export of the installed `wait.js` module located through `resolveGlobalRoot('opencode')`. A close answered `closed` or `already-closed` SHALL be listed in `closed`; any other answer, a missing `close` export, or a thrown error SHALL be listed in `close_failed`. A shell that is not a cache-warm shell, a listing entry without a `command`, and a `--state` token that does not decode SHALL close no chain. The close SHALL NOT change `status` or the exit code.

It SHALL validate every argument before any removal and SHALL exit 2 with a usage error, removing nothing, for a session id that is not a plain identifier, a missing `--cwd`, a repeated `--cwd`, or an unknown flag. `--session` SHALL be the only flag that accepts several values. The existing `sai-tools` projection SHALL install it with no new shell grant, and `sai/policies/tool-resolution.md` SHALL list it among the resolvable tools. Its tests SHALL stub the `opencode` CLI and the `wait.js` module.

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

#### Scenario: Several sessions share two listings
- **WHEN** the tool runs with two `--session` values that both have running shells
- **THEN** it lists the shells once, removes the shells of both sessions, verifies with one more listing, and prints `{status, results}` with one entry per session in the order given

#### Scenario: Worst entry sets the top status
- **WHEN** one envelope entry is `failed` and another is `removed`
- **THEN** the top `status` is `failed` and the tool exits 1

#### Scenario: Failure isolated to one session
- **WHEN** the removal of a shell of one session is refused in a multi-session call
- **THEN** the other sessions' shells are still removed and each entry reports its own status

#### Scenario: Session named twice
- **WHEN** the tool runs with the same `--session` value twice
- **THEN** it prints the envelope with one entry for that session

#### Scenario: Malformed argument removes nothing
- **WHEN** one of several `--session` values is not a plain identifier, or `--cwd` is given twice
- **THEN** the tool exits 2 with a usage error and removes no shell

#### Scenario: Removed warm shell closes its chain
- **WHEN** a removed shell's `command` is `wait.js warm --chain <id>` or `wait.js warm --state <token>` whose state names chain `<id>`
- **THEN** the tool closes chain `<id>` after the removal and lists it in `closed`

#### Scenario: Quoted path with spaces
- **WHEN** the `command` names `wait.js` through a quoted Windows path that contains spaces
- **THEN** the tool still recognizes the cache-warm shell and closes its chain

#### Scenario: Two shells of the same chain
- **WHEN** two removed shells of a session name the same chain
- **THEN** the tool closes that chain once and lists it once in `closed`

#### Scenario: Shell that is not a warm wait
- **WHEN** a removed shell runs another command, such as `transfer.js watch`, or its listing entry has no `command`
- **THEN** the tool removes it as before and closes no chain

#### Scenario: Warm shell that survives the removal
- **WHEN** a cache-warm shell is still listed after its removal
- **THEN** the tool prints `failed` and still closes that shell's chain

#### Scenario: Failed close leaves the status
- **WHEN** the close of a chain fails
- **THEN** the chain is listed in `close_failed`, and `status` and the exit code stay those of the removal

#### Scenario: No running shell closes no chain
- **WHEN** the session has no running shell
- **THEN** the tool prints `none` with empty `closed` and `close_failed` lists

### Requirement: Same-turn batch at dispose and close points

`sai/policies/worker-lifecycle.md` SHALL be the single source of the same-turn batch: independent tool calls issued together in one model response. At each dispose point a coordinator SHALL issue every stop of that point in one same-turn batch, and at each close point every directory close and removal of that point (`transfer.js close`, `temp-root.js remove`) in one same-turn batch, on Claude Code and opencode alike. On Claude Code the batch SHALL hold one `TaskStop` call per worker; on opencode it SHALL hold one `dispose-shells.js` call with one `--session` per worker to dispose. Directory closes and removals SHALL stay one call per directory. A batch SHALL NOT hold a call that needs the result of another call of the same batch. A `TaskStop` answered with `No task found` SHALL count as a result, and that worker SHALL count as disposed. When a call of a batch returns cancelled or without a result, the coordinator SHALL re-issue that call alone in the next turn; the point SHALL be complete only when every stop and close of it has a result, and a cancellation SHALL NOT be an obstacle attempt. On opencode the `dispose` message fallback SHALL stay per worker and SHALL read that worker's own entry of the envelope. The close sentences of `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/merge/coordinator.md`, and `sai/commands/plan/cycle.md` SHALL issue their stops, closes, and removals in one same-turn batch and point to `worker-lifecycle.md` for the rule.

#### Scenario: Claude Code disposes several workers at one point
- **WHEN** a Claude Code coordinator reaches a dispose point with the RED worker, the GREEN worker, and the live explorer still alive
- **THEN** it issues the three `TaskStop` calls in one model response

#### Scenario: opencode disposes several workers with one call
- **WHEN** an opencode coordinator reaches a dispose point with two workers still alive
- **THEN** it runs one `dispose-shells.js` call with both captured `sessionID` values and reads each worker's status from its own envelope entry

#### Scenario: Directory closes in one batch
- **WHEN** a completed run reaches its close point with a report directory and a run directory to remove
- **THEN** the coordinator issues `transfer.js close` and `temp-root.js remove` as parallel calls in one model response, one call per directory

#### Scenario: Cancelled call in a batch
- **WHEN** one call of a same-turn batch returns cancelled or without a result
- **THEN** the coordinator re-issues that call alone in the next turn, the point is complete only after it has a result, and no obstacle attempt is spent

#### Scenario: Finished worker in a batch
- **WHEN** a `TaskStop` of a same-turn batch is answered with `No task found`
- **THEN** that worker counts as disposed and the call is not re-issued

#### Scenario: Per-worker fallback from the envelope
- **WHEN** an opencode envelope entry reports `none` for a worker whose last real message carried `warming: true`, or `failed` or `unavailable` for any worker
- **THEN** the coordinator sends the message `dispose` to that worker only, after a one-line notice for `failed` or `unavailable`
