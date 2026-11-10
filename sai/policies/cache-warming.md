# Cache warming

An agent keeps its prompt cache warm between continuations by running a foreground arm check after each response, launching the one background wait that check allows, and re-arming on each wake. The warming ends when its dispatcher disposes it, or when `max` minutes have passed since its last real message. `wait.js` (`skills/sai-cache-warmer/wait.js`) owns the protocol: the chain, the timings, the single live wait of a chain, and the window. This policy keeps the few rules an agent follows, and it is the single source for them. Ending a worker or helper belongs to `@sai/policies/worker-lifecycle.md`. Bindings, budget skills, and coordinator cards fetch this policy and never restate it. The user-invoked `/sai-cache-warmer` is a different activity and keeps its own behavior.

Terms. **Arm**: start one background wait whose completion wakes the agent; the foreground arm check decides whether one must start. **Wake**: the turn that a completed wait triggers. **Chain**: the succession of waits one agent arms; each agent owns one chain, and only the newest wait of a chain stays live. **Warming switch**: the `Warming: on` line a dispatcher adds to a message to enable the warming of the agent that receives it; it carries no timings. **Real message**: any message to or from an agent except the `ok` of a wake or of a `dispose`. **Dispose**: the dispatcher's unconditional end of an agent it created (`@sai/policies/worker-lifecycle.md`). **Helper**: `budget-explorer`, `budget-subagent`, or `budget-executor`; **worker**: any other subagent a command creates and keeps alive. **Subagent**: a worker or helper that another agent dispatches. **Main session**: the agent that runs a command, the one a user talks to.

## The switch

A dispatcher that disposes an agent turns its warming on by ending the task message and every continuation to it with this line, naming the agent's installed name:

`Warming: on, agent {agent}. Fetch @sai/policies/cache-warming.md and follow it as a subagent.`

- Workers and `budget-explorer` receive it. `budget-subagent` receives it only on a continuation: its one-shot task message is followed by its dispose and carries none (`skills/{claude,opencode}/budget-subagent/SKILL.md` § Warming and dispose). `budget-executor` never does: it never arms.
- The ready-only dispatch of the two-phase handshake carries no task content and therefore no switch.
- A dispatcher that cannot dispose (a worker that dispatches its own helpers) sends no switch, so its helpers never arm. Only an agent that disposes another one enables its warming.
- The dispatcher resolves no timings and keeps no state about the agent's warming, except the `warming:` diagnostic of each worker's last real message, which the opencode dispose reads (§ Warming diagnostic). The agent's own `begin` reads the setting.

## Begin

The first response of an agent that received the switch (or of a main session that runs a command) starts with `begin`, in the foreground, before the first arm. `<wait-path>` is the installed `skills/sai-cache-warmer/wait.js`, resolved with the fetch tool in path mode per `@sai/policies/tool-resolution.md` (name the subpath `skills/sai-cache-warmer/wait.js` twice in one call) and run as that policy states: a project-local result as written, a global result as the absolute path its block printed, with backslashes turned into forward slashes (a path a tool returned, never one you composed).

- **Subagent**: `node "<wait-path>" begin --agent <agent> --harness <claude|opencode>`, with the agent name the switch names. The tool reads the `model` of the installed agent file.
- **Main session**: `node "<wait-path>" begin --role agent --provider <provider> [--model <model>] --harness <claude|opencode>`, with the provider and model of the running session as the harness states them (omit `--model` when it states none).

`begin` prints `{"chain": "<id>", "warming": {"interval", "max"}}` in minutes, or `{"chain": null, "warming": "off"}`. Keep the chain for the whole session.

- `off` (the setting turns the agent off, or has no entry for it): arm nothing for the session. Nothing warms until the user enables it.
- A non-zero exit (for example the harness temporary root is missing on Linux, which SAI never creates, or a main session has no harness session id): print one line that names the message `begin` printed, arm nothing, and finish the task unchanged.

A main session's chain follows its harness session id (`CLAUDE_CODE_SESSION_ID` on Claude Code, `OPENCODE_SESSION_ID` on opencode, or `--session <id>`), so `begin` in a later command invocation of the same chat returns the chain the chat already owns, and at most one wait of the main session is live. A main-session `begin` without a session id exits non-zero with a message that names the variable and arms nothing, because a new chain for each call would break that rule: the session runs without warming. A subagent `begin` needs no session id.

## Arm, wake, and window

**Arm.** Before you end the turn with your response, run the arm check `node "<wait-path>" arm --chain <chain>` in the foreground. It prints one JSON decision: when `launch` is `true`, launch one wait in the background and do not await it: Claude Code `Bash` with `run_in_background: true` and the description `cache-warm`; opencode shell with `background: true`. The command is `node "<wait-path>" warm --chain <chain>`. When `launch` is `false`, launch nothing: the chain already has a live wait, which the check reused and whose window it extended, or the chain needs no wait. Arm after every response: a result, a question, and a step report all keep the wait armed until the agent is disposed. The tool makes the decision, never your own reading of the chain. It needs the chain, so an `arm` with no `--chain`, and a `warm` with neither `--chain` nor `--state`, exit 2 and arm nothing. Then end the turn with your response exactly as your task requires: the response reaches your dispatcher while the wait stays armed.

**Window.** Each arm resolves the timings again from the setting and opens a window of `max` minutes. Warming stops when `max` minutes have passed since your last real message, whether or not anyone disposed you, and each real message restarts the window. The tool enforces it: a wait that reaches the end of its window returns `finished`.

**Wake.** A completed wait wakes you with `{"status", "waited_ms", "state", "state_token"}`; `state_token` is the same state as one brace-free, quote-free token.

- `continue`: re-arm at once with `node "<wait-path>" warm --state <state_token>` (unchanged), in the background as for an arm, and reply with the single word `ok`. The tool resolves the timings again: when the setting turned off, the next wake returns `finished`, and a new interval applies from that wait, with no restart.
- `finished`: reply `ok` and arm nothing. A wait that a later arm of its chain superseded returns `finished` too, within a few seconds and whatever its window: it costs this one wake turn and ends the earlier wait.

A wake performs no work. Run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing.

**A real message while a wait is armed.** Handle it as normal work, and arm again after you respond: the arm check decides, and a `launch` answer starts the new wait. A wait the chain replaced retires within seconds and its wake returns `finished`; you reply `ok` and arm nothing. A message that carries no switch (a helper's task message) arms nothing for a subagent and supersedes nothing: an earlier wait of its chain keeps re-arming at each wake until its window closes or the agent is disposed.

**The benchmark.** `/sai-context-cache-ttl-benchmark` applies a warming override with a cutoff mark; every chain armed before the mark ends at its next wake, in every agent and in sessions of other projects on the same harness, which then resume cold at their next real message.

**Failure.** When arming fails (no shell, a permission refusal, a missing script, an old `wait.js` that does not know `begin` or `arm` or whose `warm` exits 2), stop warming without retrying. The outcome and the report of your task do not change. A session that runs instructions from an earlier installed version is left without warming until the install is refreshed.

**Wake acknowledgement.** A subagent message that is exactly `ok` (surrounding whitespace ignored) is the reply of a wake, never a result. A dispatcher does not process it as a report, a ready, or a step result, spends no attempt on it, sends no continuation, and keeps waiting for the real result of the task. It is not a real message.

**`dispose` message.** A message that is exactly `dispose` is answered as `@sai/policies/worker-lifecycle.md` § Worker side says: reply `ok`, and from then on answer every wake with `ok` and arm nothing again.

## Warming diagnostic

Every real message a subagent sends to its dispatcher carries the line `warming: true` or `warming: false`: `true` when its wait is armed when it sends the message, `false` otherwise (no switch reached it, the setting is off, or arming failed). The line is a diagnostic. It gates no stop and no dispatch: the stop call always runs, a message without the line is read the same way, and the dispatcher keeps no value for the line except, on opencode, the one of each worker's last real message, which decides whether a `none` listing still needs the `dispose` message (`@sai/policies/worker-lifecycle.md` § Stop call).

- A worker that returns only the path of its report writes the line beside that path in the message and never inside the report file, because arming happens after the report is written.
- The `ready` reply of the two-phase startup is the exact text its prompt asks for and carries no field.
- A `budget-executor` result ends with `warming: false`.

## Dispose

Ending a worker or helper does not depend on warming: `@sai/policies/worker-lifecycle.md` owns the dispose points, the stop call, and the already-ended and failure handling. On Claude Code a dispose ends the armed wait together with the agent. On opencode it removes the running shells of the agent's session, the armed wait included. No `dispose` message is sent first, and no second stop of the wait follows; the opencode `dispose` message that `worker-lifecycle.md` § Stop call sends after a `none` listing is a fallback after the stop call. The main session is never disposed: after its closing report it keeps arming until `max` minutes have passed since its last real message, and a new command invocation in the same chat continues the same chain.

## Hand-off wait

A command that sends the user to another chat and waits for them to return (the `/sai-explore` hand-off close, `sai/commands/explore/steps/handoff-warming.md`) arms a hand-off wait: an ordinary chain of the main session whose window is a fixed deadline, which `wait.js` owns. The command settles the timings (the `agent` setting, or the user's answers to its question) and passes them explicitly, each as a positive duration in minutes unless it ends in `s`, `m`, or `h` (`20`, `30 min`, `4h`; `1h30` is refused): `begin --role agent --provider <provider> [--model <model>] --harness <claude|opencode> --interval <interval> --max <max> --fixed-deadline`. The chain record then holds the deadline, `max` minutes after that `begin`, and no arm or wake moves it.

- **Arm once.** Run `begin` as above and arm as § Arm directs at the end of the hand-off close: the check, then the background `warm --chain` it allows. The check reuses a live wait and never moves the deadline. A real message other than the event the command waits for re-arms nothing, so the deadline stays where `begin` set it; the tool also keeps it if an arm happens anyway, and after the deadline the check launches nothing.
- **Wake.** Re-arm with `--state <state_token>` (the returned token, unchanged) and reply `ok`. Each re-arm launches a new background task, so replace the task id the command holds for the wait with the new task's id (the chain stays the same); the stop must end the live task, not the one that already ended. The timings stay as passed to `begin`.
- **End.** At the deadline the wait returns `finished`: reply `ok` and arm nothing, and no wake follows. The command stops the wait earlier through "Stop your own wait" when the user returns with the event it waits for, or when a new invocation of the command starts.
- **State.** The background task id, the chain, and the answers live in the conversation only, never in the `sai-state` store or a repository file.

## Stop your own wait

To stop the wait that your own session armed (the benchmark's measurement and the hand-off wait need this), end the background task it launched: Claude Code `TaskStop` with that task's ID, opencode the shell removal of that shell. Then dispose every worker and helper still alive, under `@sai/policies/worker-lifecycle.md`. A stop that finds the task already ended is harmless and spends no attempt.
