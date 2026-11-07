# Worker lifecycle

Single source for when and how a coordinator ends the workers and helpers it creates, and for the rule every worker follows on the commands it launches. Ending a worker never depends on the warming setting: `@sai/policies/cache-warming.md` decides whether a worker's prompt cache stays warm, and this policy decides when the worker ends. Coordinators, worker bindings, and helper skills fetch this file and never restate it.

Terms. **Dispose**: the unconditional action that ends a worker or helper the coordinator created, whatever the warming setting and whatever the worker's latest `warming` diagnostic. **Last use**: the point after which the coordinator sends no further message to that worker. **Handle**: the identifier the coordinator captured when it created the worker (the agent ID on Claude Code, the `sessionID` on opencode). **Worker**, **helper**, and **live explorer** keep the meaning they have in `cache-warming.md` Terms and below.

## Dispose

A coordinator disposes every worker and helper it creates, at each of these points:

- **Last use.** After the last message the coordinator expects from the worker is read and handled, and no continuation is planned.
- **Replacement.** Before the replacement receives its first message. A message the old worker still sends afterwards is not processed as a result.
- **Abandon or stop.** When the user stops the run, abandons the route, or dismisses a question the worker was waiting on, before the coordinator resets any run or slice state.
- **Close.** Before the `close` event or the closing report, in every outcome. A segment that ends inside a chain of segments is a close of its own: its workers are disposed before the next segment starts.

A worker with a pending `needs_input` question has not reached its last use: it stays alive until the answer reaches it as a continuation.

**Helpers.** A one-shot helper (`budget-subagent`, `budget-executor`) is disposed after its result. A live explorer is the explorer a coordinator keeps for its whole run and reuses for its sequential searches, each later search a continuation on the same handle; it is not disposed between searches, and it is disposed at the route end, on abandon or stop, and at run close. Parallel searches start additional explorers, which are reused and disposed the same way.

Claude Code and opencode dispose at the same points and differ only in the stop call.

## Stop call

- **Claude Code**: `TaskStop(task_id: "<captured agent ID>")`.
- **opencode**: `node <tool-path> --session <sessionID> --cwd <project-root>`, with `dispose-shells.js` resolved per `@sai/policies/tool-resolution.md`, the captured `sessionID`, and the project root. The tool removes every running shell of that session, which ends the agent's armed cache-warm wait with them, and prints `{"status": "removed" | "none" | "failed" | "unavailable"}`. `removed` and `none` (a worker with no running shell) are a complete dispose and print no notice. Send the message `dispose` only when the status is `failed` or `unavailable`, after printing a one-line notice: from then on the agent answers each wake with `ok` and arms nothing. No `session.interrupt` call exists in this stop: it returns 404 for a child session, and aimed at your own session it aborts the tool call that is running.

One dispose also ends the cache-warm wait the agent armed; no second stop action follows. Neither harness sends the `dispose` message first.

## Outcomes

- **Already ended.** A worker that finished or no longer exists counts as disposed. It spends no attempt and triggers no retry. On Claude Code, `TaskStop` on a cleanly finished worker returns `No task found`.
- **Lost handle.** Handles live in conversation state only, never in the `sai-state` store. A handle lost to a context compaction is skipped: dispose the workers whose handles you still hold. The run outcome does not change.
- **Other failure.** For any other dispose failure (a permission refusal, a failed `TaskStop`, the `dispose` fallback itself), print one notice naming the worker role and the error. The run continues to its close and keeps its outcome.

## Worker side

Every worker and helper follows these rules.

- **Shell hygiene.** Send no result, step report, or question while a command you launched is still running. Await each background command you started, or end it first (Claude Code `TaskStop` on its background task, opencode removal of its shell). End a command that does not terminate and report it as a failed command in that same message.
- **Warm wait exemption.** The cache-warm wait that you arm after a response is exempt from the shell rule: `cache-warming.md` arms it after the message by design.
- **`dispose` message.** A message that is exactly `dispose` is the fallback of the opencode stop call. Reply `ok`, run no tool, arm nothing again, and answer each later wake of a wait you armed with `ok` alone.
