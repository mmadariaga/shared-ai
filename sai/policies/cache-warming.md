# Cache warming

An agent keeps its prompt cache warm between continuations by arming one background wait after each response and re-arming on each wake, until a configured maximum or until its dispatcher disposes it. A worker resumed after a longer pause than the cache lifetime rewrites its whole prefix instead of reading it; a wake costs two short requests, so the window is bounded. This policy is the single source for arming, waking, the window, resolving timings, and disposing. Bindings, budget skills, and coordinator cards fetch it and never restate it. The user-invoked `/sai-cache-warmer` is a different activity and keeps its own behavior.

Terms. **Arm**: start one background wait whose completion wakes the agent. **Wake**: the turn that a completed wait triggers. **Dispose**: stop an agent's warming from outside. **Agent role**: a main session that runs a command (a coordinator). **Subagent role**: a worker or helper that another agent dispatches. **Live explorer**: an explorer kept armed and reused by its coordinator until run close.

## Timings

Timings are `interval` and `max`, in minutes, from the `warming` setting of `.sai/settings.jsonc` (overridable by `.sai/settings.local.jsonc`), keyed by provider, model, and role. Nothing warms until the user enables it: no entry, or a `false` entry, means off. Resolve them fresh for every arm, so a changed setting, a local override included, applies from the next arm and no agent restarts.

Run `node <tool-path> warming --provider <provider> --model <model> --role <agent|subagent> --json --cwd <project-root>`, with `project-settings.js` resolved per `@sai/policies/tool-resolution.md`. It prints `{"warming": "off" | {"interval", "max"}, "origin", "warnings"}`. A non-zero exit or unreadable output is `off`.

- **Provider and model of a subagent**: the `model` frontmatter of its installed agent file (`.claude/agents/{agent}.md`, then `~/.claude/agents/{agent}.md` on Claude Code; the `agents/` folder of `.opencode/`, then `~/.config/opencode/`, on opencode). On Claude Code the provider is `anthropic` and the model is the frontmatter value as written. On opencode the value is `<provider>/<model>`: the provider is the text before the first `/`, the model the rest. The agent cannot read its own runtime model, so its dispatcher resolves for it.
- **Provider and model of the main session**: those of the running session, as the harness states them; omit `--model` when the session does not state its model.
- **Role**: `agent` for the main session, `subagent` for everything a dispatcher creates.

## Dispatcher: send the timings

At every dispatch and every continuation of a subagent, resolve its timings with the `subagent` role. When the result is not `off`, end the task message with this line, and send no such line otherwise:

`Warming: Fetch @sai/policies/cache-warming.md and follow it as a subagent with interval {interval} and max {max}.`

The ready-only dispatch of the two-phase handshake carries no task content and therefore no such line. A dispatcher that cannot dispose (a worker that dispatches its own helpers) sends no line, so its helpers never arm.

## Arm, wake, and window

Everything here applies to an agent that holds timings: a subagent whose latest real message carries the line above, or a main session whose resolver result is not `off`.

**Arm.** Before you end the turn with your response, launch one wait in the background and do not await it: Claude Code `Bash` with `run_in_background: true` and the description `cache-warm`; opencode shell with `background: true`. The command is `node "<wait-path>" warm` with `{"interval": {interval}, "max": {max}}` on stdin through a quoted heredoc. `<wait-path>` is the installed `skills/sai-cache-warmer/wait.js`: on Claude Code `.claude/skills/sai-cache-warmer/wait.js`, then `~/.claude/skills/sai-cache-warmer/wait.js`; on opencode `.opencode/skills/sai-cache-warmer/wait.js`, then `~/.config/opencode/skills/sai-cache-warmer/wait.js`. Then end the turn with your response exactly as your task requires: the response reaches your dispatcher while the wait stays armed. Arm after every response, a question and a closing report included.

**Window.** The first `warm` call opens a window of `max` minutes. Warming stops when `max` minutes have passed since your last real task or continuation, and each real continuation restarts that window.

**Wake.** A completed wait wakes you with `{"status", "waited_ms", "state"}`.

- `continue`: re-arm at once with `{"state": <state, unchanged>}` and reply with the single word `ok`. The main session first resolves its `agent` timings again (that call belongs to the re-arm): when the result is `off`, it re-arms nothing, and otherwise it adds `"interval": <resolved interval>` beside the state.
- `finished`: reply `ok` and arm nothing.
- A subagent whose latest real message carried no `Warming:` line arms nothing on a wake, whatever the state says.

A wake performs no work. Run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing.

**A real message while a wait is armed.** Handle it as normal work, and arm again after you respond with the timings of that message. A late wake of the earlier wait is an ordinary wake: its window closes first.

**Failure.** When arming fails (no shell, a permission refusal, a missing script), stop warming without retrying. The outcome and the report of your task do not change.

**`dispose` message.** When the message is exactly `dispose`, reply `ok` and arm nothing again. It is the fallback of the dispose actions below.

## Dispose

Dispose is a dispatcher action on the handle it captured at dispatch: it stops an agent's warming from outside, without a model turn. Disposing an unknown, finished, or already disposed agent is a silent no-op.

- **Claude Code**: `TaskStop(task_id: <agent ID>)`, the same pattern as `sai/commands/explore/steps/slice.md` uses to stop a worker.
- **opencode**: `shell.remove` of the outstanding shell of the agent's session, then `session.interrupt` of that session. `session.interrupt` alone does nothing on an idle session, so the shell goes first.
- **Neither reachable** (for example the server API is not reachable from the session): send the message `dispose`. It costs one model turn.

**Workers.** A coordinator disposes each long-lived worker at run close, at a segment boundary (when a following segment starts), and when it replaces the worker. A pending `needs_input` question keeps its worker armed, because the answer is a continuation.

**Live explorer.** A coordinator keeps one explorer for its whole run and reuses it for every sequential search: the first search goes through the ready handshake, and each later search is a continuation on the same handle with its own per-segment tool-call ceiling. Parallel searches start additional explorers, which are reused the same way. Dispose all of them at run close; a command with no run close disposes them when its route ends or is abandoned, and otherwise the `max` window bounds them.

**Other helpers.** An executor, a task subagent, or any other helper arms like any subagent. Dispose it as soon as you have its result, unless the card says you reuse it; when in doubt, dispose it.

## Stop your own wait

To stop the wait that your own session armed (the benchmark's measurement needs this), end the background task it launched: Claude Code `TaskStop` with that task's ID, opencode the shell removal of that shell. Then dispose every agent your session keeps armed, as above.
