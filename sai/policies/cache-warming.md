# Cache warming

An agent keeps its prompt cache warm between continuations by arming one background wait after each response and re-arming on each wake, until a configured maximum or until its dispatcher disposes it. A subagent declares in every real message whether its wait is armed, and its dispatcher disposes only what the subagent declared armed. A worker resumed after a longer pause than the cache lifetime rewrites its whole prefix instead of reading it; a wake costs two short requests, so the window is bounded. This policy is the single source for arming, waking, the window, resolving timings, and disposing. Bindings, budget skills, and coordinator cards fetch it and never restate it. The user-invoked `/sai-cache-warmer` is a different activity and keeps its own behavior.

Terms. **Arm**: start one background wait whose completion wakes the agent. **Wake**: the turn that a completed wait triggers. **Dispose**: stop an agent's warming from outside. **Agent role**: a main session that runs a command (a coordinator). **Subagent role**: a worker or helper that another agent dispatches. **Live explorer**: an explorer kept armed and reused by its coordinator until run close. **Chain**: the waits one agent arms in succession from its first arm; each agent owns one chain, and only the newest wait of a chain stays live. **Final response**: a response after which the agent expects no continuation: a coordinator's closing report, or a worker's terminal result (`completed`, `failed`, `cancelled`). A question (`needs_input`) and an intermediate step report are not final. **Warming field**: the `warming: true|false` line a subagent puts in each real message to its dispatcher; `true` means its wait was armed when it sent that message. **Warm-up**: the dispatcher's order to a finished helper to arm without doing other work. **Helper**: `budget-explorer`, `budget-subagent`, or `budget-executor`; **worker**: any other subagent a command creates and keeps alive. **Real message**: any subagent message except the `ok` of a wake or of a `dispose`.

## Timings

Timings are `interval` and `max`, in minutes, from the `warming` setting of `.sai/settings.jsonc` (overridable by `.sai/settings.local.jsonc`), keyed by provider, model, and role. Nothing warms until the user enables it: no entry, or a `false` entry, means off. Resolve them fresh for every arm, so a changed setting, a local override included, applies from the next arm and no agent restarts.

Run `node <tool-path> warming --provider <provider> --model <model> --role <agent|subagent> --json --cwd <project-root>`, with `project-settings.js` resolved per `@sai/policies/tool-resolution.md`. It prints `{"warming": "off" | {"interval", "max"}, "origin", "warnings"}`. A non-zero exit or unreadable output is `off`.

- **Provider and model of a subagent**: the `model` frontmatter of its installed agent file (`.claude/agents/{agent}.md`, then `~/.claude/agents/{agent}.md` on Claude Code; the `agents/` folder of `.opencode/`, then `~/.config/opencode/`, on opencode). On Claude Code the provider is `anthropic` and the model is the frontmatter value as written. On opencode the value is `<provider>/<model>`: the provider is the text before the first `/`, the model the rest. The agent cannot read its own runtime model, so its dispatcher resolves for it.
- **Provider and model of the main session**: those of the running session, as the harness states them; omit `--model` when the session does not state its model.
- **Role**: `agent` for the main session, `subagent` for everything a dispatcher creates.

## Dispatcher: send the timings

At every dispatch and every continuation of a worker, resolve its timings with the `subagent` role. When the result is not `off`, end the task message with this line, and send no such line otherwise:

`Warming: Fetch @sai/policies/cache-warming.md and follow it as a subagent with interval {interval} and max {max}.`

The ready-only dispatch of the two-phase handshake carries no task content and therefore no such line. A dispatcher that cannot dispose (a worker that dispatches its own helpers) sends no line, so its helpers never arm. A helper task or continuation carries no warming line either: the only order that makes a helper arm is `warm-up` below.

**Wake acknowledgement.** A subagent message that is exactly `ok` (surrounding whitespace ignored) is the reply of a wake, never a result. Do not process it as a report, a ready, or a step result, spend no attempt on it, send no continuation, and keep waiting for the real result of the task. It is not a real message: it carries no warming field and leaves the latest declared value unchanged.

## Warming declaration

Every real message a subagent sends to its dispatcher states, as its own line `warming: true` or `warming: false`, whether its wait is armed at that moment. The subagent arms first (see Arm, wake, and window) and then writes the message, so `true` is declared only after the arm succeeded.

- `warming: false` is declared when the latest task message carried no `Warming:` line (every message while the warming setting is `off`), when arming failed or was refused, and in a final response, which arms nothing. A step report or a `needs_input` question that keeps the wait armed declares `true`.
- A helper's result is final: it declares `false` and arms nothing until a `warm-up`. Its reply to a new work order declares `false` as well, even when an earlier `warm-up` left a wait armed.
- The `ready` reply of the two-phase startup is the exact text its prompt asks for and carries no field; it counts as `false`, because that dispatch never carries the `Warming:` line.
- A worker that returns only the path of its report writes the line beside that path in the message and never inside the report file, because arming happens after the report is written.
- A message with no `warming` field counts as `warming: false` (for example, from a worker installed at an earlier version).

The dispatcher keeps the latest declared value of each handle in conversation state only, never in the `sai-state` store. A value lost to a compaction or a resumed run counts as `false`.

**Warm-up.** To keep a finished `budget-explorer` or `budget-subagent` warm before reusing it, send it the message `warm-up` followed by the warming line above, only when its latest declared value is `false` and its resolved timings are not `off`. Never send it to a `budget-executor` or to a worker. The helper arms, does no other work, and replies with the declaration line alone: `warming: true`, or `warming: false` when arming failed. It costs the helper one model turn.

## Arm, wake, and window

Everything here applies to an agent that holds timings: a subagent whose latest real message carries the line above (a worker message or a `warm-up`), or a main session whose resolver result is not `off`.

**Arm.** Before you end the turn with your response, launch one wait in the background and do not await it: Claude Code `Bash` with `run_in_background: true` and the description `cache-warm`; opencode shell with `background: true`. The command is `node "<wait-path>" warm` with `{"interval": {interval}, "max": {max}}` on stdin through a quoted heredoc. `<wait-path>` is the installed `skills/sai-cache-warmer/wait.js`: on Claude Code `.claude/skills/sai-cache-warmer/wait.js`, then `~/.claude/skills/sai-cache-warmer/wait.js`; on opencode `.opencode/skills/sai-cache-warmer/wait.js`, then `~/.config/opencode/skills/sai-cache-warmer/wait.js`. Then end the turn with your response exactly as your task requires: the response reaches your dispatcher while the wait stays armed. Arm after every response except your final response: a question and an intermediate step report keep the wait armed, and after a closing report or a terminal result arm nothing, so a finished session never wakes again. A subagent reports the outcome in the warming field of its message. Before your first arm, run `node "<wait-path>" chain` in the foreground: it prints `{"chain": "<id>"}`. That id is your chain for the rest of your session (a wait returns its `state` only at its wake, so you cannot learn the id from an armed wait). Pass it with the arm that follows every real message, as `{"interval": {interval}, "max": {max}, "chain": "<chain>"}`; the arm bumps the chain's generation, which supersedes every earlier wait of your chain. The re-arm on a wake passes the returned `state` back unchanged, and that state carries the chain.

**Window.** The first `warm` call opens a window of `max` minutes. Warming stops when `max` minutes have passed since your last real task or continuation, and each real continuation restarts that window. A wait that a later arm of its chain superseded, or that was armed before the benchmark applied or restored its warming override (`@skills/sai-context-cache-ttl-benchmark/SKILL.md`), ends at its next wake; waits armed afterwards follow the override's timings. Supersession by a later arm touches only that agent's own chain; the override's cutoff ends every chain armed before it, of every agent and, because the mark lives in the harness's SAI temp root, of sessions in other projects on the same harness too, which then resume cold at their next real message.

**Wake.** A completed wait wakes you with `{"status", "waited_ms", "state"}`.

- `continue`: re-arm at once with `{"state": <state, unchanged>}` and reply with the single word `ok`. The main session first resolves its `agent` timings again (that call belongs to the re-arm): when the result is `off`, it re-arms nothing, and otherwise it adds `"interval": <resolved interval>` beside the state.
- `finished`: reply `ok` and arm nothing. A superseded wait returns `finished` too, whatever its window: it costs this one wake turn and ends the earlier chain generation.
- A subagent whose latest real message carried no `Warming:` line arms nothing on a wake, whatever the state says.

A wake performs no work. Run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing.

**A real message while a wait is armed.** Handle it as normal work, and arm again after you respond with the timings of that message and your `chain` id. The earlier wait is superseded: its late wake returns `finished`, and you reply `ok` and arm nothing. When that message carries no `Warming:` line (a helper's task message), arm nothing: the earlier wait ends at its next wake, as the Wake rules say.

**Failure.** When arming fails (no shell, a permission refusal, a missing script), stop warming without retrying and declare `warming: false` in that same message. The outcome and the report of your task do not change.

**`dispose` message.** When the message is exactly `dispose`, reply `ok` and arm nothing again. It is the fallback of the dispose actions below.

## Dispose

Dispose is a dispatcher action on the handle it captured at dispatch: it stops an agent's warming from outside, without a model turn. Dispose only a handle whose latest real message declared `warming: true`. For any other handle (declared `false`, no declaration, or a lost value) do nothing: no stop call, no shell removal, and no `dispose` message. With the warming setting `off` nothing is ever armed, so nothing is ever disposed.

- **Claude Code**: `TaskStop(task_id: <agent ID>)`, the same pattern as `sai/commands/explore/steps/slice.md` uses to stop a worker.
- **opencode**: `shell.remove` of the outstanding shell of the agent's session, then `session.interrupt` of that session. `session.interrupt` alone does nothing on an idle session, so the shell goes first.
- **Neither reachable** (for example the server API is not reachable from the session): send the message `dispose`. It costs one model turn.

A dispose after a `true` declaration can find nothing left to stop because the `max` window expired first. That result is expected and harmless: it is not an obstacle, spends no attempt, and is not retried.

**Workers.** A coordinator disposes each long-lived worker whose latest declaration is `true` at run close, at a segment boundary (when a following segment starts), and when it replaces the worker. A pending `needs_input` question keeps its worker armed, because the answer is a continuation.

**Live explorer.** A coordinator keeps one explorer for its whole run and reuses it for every sequential search: the first search goes through the ready handshake, and each later search is a continuation on the same handle with its own per-segment tool-call ceiling. Parallel searches start additional explorers, which are reused the same way. An explorer's result declares `warming: false`; send it a `warm-up` only when you will reuse it after an idle stretch. Dispose the explorers whose latest declaration is `true` at run close; a command with no run close disposes them when its route ends or is abandoned, and otherwise the `max` window bounds them.

**Other helpers.** An executor never arms and needs no dispose. A task subagent is disposed after you have its result only when its latest declaration is `true`, which only a `warm-up` you sent can make so.

## Hand-off wait

A command that sends the user to another chat and waits for them to return (the `/sai-explore` hand-off close, `sai/commands/explore/steps/handoff-warming.md`) arms a hand-off wait: the same wait as above, with a fixed deadline and no re-arm on real messages. The deadline is the `max` minutes after the arm that opened the wait; the arm sits at the end of the hand-off close, so the deadline is counted from that close.

- **Timings.** They come from the `warming` setting for the `agent` role when it applies, and otherwise from the user's answers to the command's question. An answer is the user's opt-in, so the wait arms although the setting has no entry.
- **Arm once.** Arm only at the end of the hand-off close, with the chain as above. Do not arm again after a real message and do not restart the window: a real message neither re-arms the wait nor moves the deadline, whatever the Window and Arm rules say about a real message. Only a wake re-arms.
- **Wake.** Re-arm with the returned `state` unchanged and reply `ok`. Each re-arm launches a new background task, so replace the task id the command holds for the wait with the new task's id (the chain stays the same); the stop must end the live task, not the one that already ended. When the interval came from the user's answers, add no `interval` and resolve no setting: a wake that resolved the `agent` timings would find `off` and end the wait at its first wake. When the timings came from the setting, the wake rule above applies as written.
- **End.** At the deadline the wait returns `finished`: reply `ok` and arm nothing, and no wake follows. The command stops the wait earlier through "Stop your own wait" when the user returns with the event it waits for, or when a new invocation of the command starts.
- **State.** The background task id, the chain, and the answers live in the conversation only, never in the `sai-state` store or a repository file.

## Stop your own wait

To stop the wait that your own session armed (the benchmark's measurement and the hand-off wait need this), end the background task it launched: Claude Code `TaskStop` with that task's ID, opencode the shell removal of that shell. Then dispose every agent whose latest declaration is `true`, as above. A stop that finds the task already ended is harmless and spends no attempt.
