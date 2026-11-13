# Worker lifecycle

Single source for when and how a coordinator ends the workers and helpers it creates, and for the rule every worker follows on the commands it launches. Ending a worker never depends on the warming setting: `@sai/policies/cache-warming.md` decides whether a worker's prompt cache stays warm, and this policy decides when the worker ends. Coordinators, worker bindings, and helper skills fetch this file and never restate it.

Terms. **Dispose**: the unconditional action that ends a worker or helper the coordinator created, whatever the warming setting and whatever the worker's latest `warming` diagnostic (the diagnostic decides only the opencode `dispose` message after a `none` listing, § Stop call). **Last use**: the point after which the coordinator sends no further message to that worker. **Handle**: the identifier the coordinator captured when it created the worker (the agent ID on Claude Code, the `sessionID` on opencode). **Worker**, **helper**, and **live explorer** keep the meaning they have in `cache-warming.md` Terms and below.

## Dispose

A coordinator disposes every worker and helper it creates, at each of these points:

- **Last use.** After the last message the coordinator expects from the worker is read and handled, and no continuation is planned.
- **Replacement.** Before the replacement receives its first message. A message the old worker still sends afterwards is not processed as a result.
- **Abandon or stop.** When the user stops the run, abandons the route, or dismisses a question the worker was waiting on, before the coordinator resets any run or slice state.
- **Close.** Before the `close` event or the closing report, in every outcome. A segment that ends inside a chain of segments is a close of its own: its workers are disposed before the next segment starts.

A worker with a pending `needs_input` question has not reached its last use: it stays alive until the answer reaches it as a continuation.

**Helpers.** A one-shot helper (`budget-subagent`, `budget-executor`) is disposed after its result. A live explorer is the explorer a coordinator keeps for its whole run and reuses for its sequential searches, each later search a continuation on the same handle; it is not disposed between searches, and it is disposed at the route end, on abandon or stop, and at run close. Parallel searches start additional explorers, which are reused and disposed the same way.

Claude Code and opencode dispose at the same points and differ only in the stop call.

## Same-turn batch

The cost unit of a dispose or close point is the model turn, not the tool call: independent calls are issued together in one model response (a **same-turn batch**), never one per turn. At each dispose point the coordinator emits every stop of the point in one batch, and at each close point every directory close and removal of the point (`transfer.js close`, `temp-root.js remove`) in one batch, on Claude Code and opencode alike. The calls of a batch are independent of each other and stay one call per directory. A batch never holds a call that needs the result of another call of the same batch. A `TaskStop` answered with `No task found` counts as a result: that worker is disposed.

When a call of a batch returns cancelled or without a result, the coordinator re-issues that call alone in the next turn. The point is complete only when every stop and close of it has a result. A cancellation is not an obstacle attempt.

## Stop call

- **Claude Code**: `TaskStop(task_id: "<captured agent ID>")`, one call per worker, all issued in one same-turn batch.
- **opencode**: `node <tool-path> --session <sessionID> [--session <sessionID> ...] --cwd <project-root>`, with `dispose-shells.js` resolved per `@sai/policies/tool-resolution.md`, the captured `sessionID` of every worker to dispose at the point (one call, one `--session` each), and the project root. The tool removes every running shell of each session, which ends the agent's armed cache-warm wait with them. After the removal, and whatever its outcome, the tool closes the cache-warm chain of each `wait.js warm` shell it removed (`wait.js close`), so the woken agent cannot arm another wait; the main session's chain is never closed. Each result lists the chain ids it closed as `closed` and the ones whose close failed as `close_failed`; a failed close never changes `status` or the exit code. With one `--session` it prints an object `{"status", "removed", "failed"}` whose `status` is one of `removed`, `none`, `failed`, or `unavailable`. With two or more it prints the envelope `{"status", "results": [{"session", "status", "removed", "failed"}]}`, one entry per distinct session in the order given, and its top `status` is the worst entry (`unavailable` > `failed` > `removed` > `none`); read each entry for the worker it names. A malformed argument ends the call with exit 2 and removes nothing. `removed` is a complete dispose and prints no notice. `none` means the session has no running shell at that moment: a worker that is warming can sit in the gap between a wait's exit and its re-arm, so `none` ends nothing for it. The fallback stays per worker, and the status is the one of that worker (its entry's, in an envelope). Send the message `dispose` when the status is `none` and the `warming:` line of the worker's last real message was `true` (keep that value with the handle; a worker that never sent the line, for example one that only answered the ready handshake, receives none), and when the status is `failed` or `unavailable`, the last two after printing a one-line notice. A worker that is not warming receives no message, so a dispose adds no turn to the common warming-off case. From then on the agent answers each wake with `ok` and arms nothing. No `session.interrupt` call exists in this stop: it returns 404 for a child session, and aimed at your own session it aborts the tool call that is running.

One dispose also ends the cache-warm wait the agent armed; no second stop action follows. Neither harness sends the `dispose` message first: on opencode it follows the stop call only in the cases of § Stop call, and Claude Code never sends it.

## Outcomes

- **Already ended.** A worker that finished or no longer exists counts as disposed. It spends no attempt and triggers no retry. On Claude Code, `TaskStop` on a cleanly finished worker returns `No task found`.
- **Lost handle.** Handles, and the last `warming:` line kept with each, live in conversation state only, never in the `sai-state` store. A handle lost to a context compaction is skipped: dispose the workers whose handles you still hold. The run outcome does not change.
- **Other failure.** For any other dispose failure (a permission refusal, a failed `TaskStop`, the `dispose` fallback itself), print one notice naming the worker role and the error. The run continues to its close and keeps its outcome.

## Worker side

Every worker and helper follows these rules.

- **Shell hygiene.** Send no result, step report, or question while a command you launched is still running. Await each background command you started, or end it first (Claude Code `TaskStop` on its background task, opencode removal of its shell). End a command that does not terminate and report it as a failed command in that same message.
- **Warm wait exemption.** The cache-warm wait that you arm after a response is exempt from the shell rule: `cache-warming.md` arms it after the message by design.
- **`dispose` message.** A message that is exactly `dispose` is the fallback of the opencode stop call. Reply `ok`, run no tool, arm nothing again, and answer each later wake of a wait you armed with `ok` alone.
