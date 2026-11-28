# Claude Code dispatch from opencode

Single source for how an opencode coordinator creates, continues, and disposes a worker through the Claude Code CLI, so the model, effort, tools, and permission mode come from the Claude Code agent of the same name. The opencode routed-worker binding template fetches this file and never restates it; budget agents and the helpers a worker dispatches keep their opencode dispatch. With Claude Code as the main harness this policy does not apply: dispatch there stays as each card and skill write it, and only an opencode agent file is read for the route key.

Terms. **Claude-routed worker**: an opencode worker whose agent file carries `harness: claude`. **Handle**: the session UUID that `start` returns, which every later turn and the stop name. **Turn**: one coordinator message to a worker and its reply, run as one `claude -p` process by `claude-dispatch.js`. **Message directory**: a private directory the coordinator opens once per run for the files that carry its messages to Claude-routed workers.

## Route

Before creating a worker, every time and with no check of the agent file first, resolve `sai/tools/claude-dispatch.js` (`<dispatch-path>`) per `@sai/policies/tool-resolution.md` and run `node <dispatch-path> route --agent <name> --cwd <project-root>`. It prints `{route, cause, agent, notice?}`:

- `opencode`: create the worker with the native `subagent` call of the dispatch site. An agent file without the `harness:` key, or with any value other than `claude`, always takes this branch. When the answer carries a `notice` (the `claude` command is missing, its shim names no executable that exists, `claude auth status` reports no signed-in session, or Claude Code has no agent file of that name), print it once as one visible message.
- `claude`: dispatch as below. This branch carries no `notice`.

The route is asked again for every created worker, a replacement included. A continuation follows the route its worker was created with.

## Create

1. Open the message directory once per run with `transfer.js`, resolved per the same policy: `node <transfer-path> open --note "open the message directory" --harness opencode`. Keep its `dir` with the handles, and close it with the run's other directories at close.
2. Write the ready prompt, the same prompt the `subagent` call of the dispatch site sends, as UTF-8 to a unique file in that directory with the native write tool.
3. Run `node <dispatch-path> start --agent <name> --input-file <file> --cwd <project-root>` with the shell and `background: true` (description `claude-<name>`), and keep the shell's task id.
4. When the task completes, read its one JSON object: `{status, sessionID, text, tokens, cost, exit_code, error}`. `status: ok` makes `sessionID` the worker's handle and `text` its ready reply. A ready turn that is `failed` (non-zero exit, an error result, or no `sessionID`) is a fallback: print one notice naming the agent and `error`, and create the worker through the native `subagent` call instead. The abandoned session needs no stop. A parallel batch matches each result to its worker by the kept task id, never by `sessionID`, which the result itself supplies.

## Continue

Each later message is a new turn, never a continuation of the native handle: write the message to a new file in the message directory, then run `node <dispatch-path> continue --session <sessionID> --agent <name> --input-file <file> --cwd <project-root>` with the shell and `background: true`, and replace the kept task id with the new one. The tool holds a turn lock per session while a turn runs, so a turn never starts while an earlier turn of the same worker still runs. A `continue` that finds the lock of a live process sends nothing and prints `status: busy` (with `busy_pid`) at exit code 3: it is no failed turn and no obstacle attempt. Wait for the completion notification of that earlier turn (the shell task id you kept for it), then resend the same message once, from the same file. A second `busy` after that notification is a failed turn of the step, handled as the next paragraph says. A lock whose process no longer exists is ignored, so a turn that was killed leaves nothing to clear. The completed turn's `text` is the worker's message, read exactly like a `subagent` reply: a worker that reports through `@sai/policies/worker-report-transport.md` returns only its `{path, sha256}` reference, and the coordinator validates it as that policy says.

A turn that is `failed` after the ready turn is an ordinary obstacle of the coordinator's step, handled under `@sai/policies/obstacle-escalation.md` or the card's own recovery. The replacement worker is routed again from § Route.

## Warming

A Claude-routed worker receives no cache-warming switch: its messages end without the `Warming:` line, and its messages declare `warming: false`. It is never armed, so the coordinator's `warming` bookkeeping holds `false` for it.

## Reports and questions

The report directory is the one the coordinator opened under the opencode SAI temp root. The worker runs from the Claude Code install, so its tools would infer the Claude Code temp root. For that reason a task message to a Claude-routed worker that carries `--report-dir` has `--harness opencode` as its second line, right after it, the envelope line that `@sai/policies/worker-report-transport.md` § Author boundary defines. A message without `--report-dir` (the ready prompt, for example) carries no such line, and the tool adds nothing to any message: it passes the file's text unchanged.

A worker question reaches the coordinator only as a `needs_input` report. No turn opens an interactive prompt: `claude -p` cannot ask, so a tool call outside the pre-approved set is denied and returns as a visible denial in the turn. The agent works with the `tools:` list and the optional `permissionMode:` of its Claude Code agent file, which the tool passes as `--allowedTools` and `--permission-mode`, and every turn, a resumed one included, names the agent with `--agent` and adds the opencode SAI temp root with `--add-dir`, so the worker can write its report drafts there; it never passes `--model` or `--effort`, because the file carries them.

**Helpers.** Inside the child, the worker is a Claude Code dispatcher: it dispatches its helpers by Claude Code's own rules, `@sai/policies/opencode-dispatch.md` included, and only an opencode dispatcher reads the route key. Those helpers end with the turn that stops the worker.

## Dispose

Dispose a Claude-routed worker at the points `@sai/policies/worker-lifecycle.md` lists. The stop is `node <dispatch-path> stop --session <sessionID> --cwd <project-root>`, which kills the process tree of the turn's lock and releases it, answered with `stopped`, or with `none` when no turn runs (a lock whose PID now belongs to another program included, which the stop never signals); it is issued in the same same-turn batch as the point's other stops, beside the worker's `retire-handle` record. A stopped worker or a `none` answer counts as disposed, and no `dispose` message and no `dispose-shells.js` call apply on this route.
