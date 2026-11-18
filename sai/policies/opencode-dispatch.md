# OpenCode dispatch from Claude Code

Single source for how a Claude Code coordinator (or a Claude Code worker that dispatches helpers) creates, continues, and disposes an agent through the OpenCode CLI, so the model comes from the OpenCode agent of the same name. Every dispatch site fetches this file and never restates it: the routed-worker binding template, the three budget skills, and the design overview step. With opencode as the main harness this policy does not apply: dispatch there stays as each card and skill write it, and the `harness:` key exists only in Claude Code agent files.

Terms. **opencode-routed agent**: an agent whose Claude Code agent file carries `harness: opencode`. **Handle**: the identifier the coordinator uses to continue a worker: the agent ID for `Agent` dispatch, the opencode `sessionID` for an opencode-routed agent. **Turn**: one coordinator message to a worker and its reply; for an opencode-routed agent, one `opencode run` process run by `opencode-dispatch.js`. **Message directory**: a private directory the coordinator opens once per run for the files that carry its messages to opencode-routed agents.

## Route

Before creating an agent, every time and with no check of the agent file first, resolve `sai/tools/opencode-dispatch.js` (`<dispatch-path>`) per `@sai/policies/tool-resolution.md` and run `node <dispatch-path> route --agent <name> --cwd <project-root>`. It prints `{route, cause, agent, notice?}`:

- `claude`: dispatch through the `Agent` tool exactly as the dispatch site says. An agent file without the `harness:` key, or with `harness: claude`, always takes this branch. When the answer carries a `notice` (the `opencode` command is missing, its shim names no executable that exists, or it has no agent of that name), print it once as one visible message.
- `opencode`: dispatch as below.

The route is asked again for every created worker, a replacement included. A continuation follows the route its worker was created with.

## Create

1. Open the message directory once per run with `transfer.js`, resolved per the same policy: `node <transfer-path> open --harness claude`. Keep its `dir` with the handles, and close it with the run's other directories at close.
2. Write the ready prompt, the same prompt the `Agent` call of the dispatch site sends, as UTF-8 to a unique file in that directory with the native write tool.
3. Run `node <dispatch-path> start --agent <name> --input-file <file> --cwd <project-root>` with `Bash` and `run_in_background: true` (description `opencode-<name>`), and keep the `Bash` task id. Several workers start the same way, one `Bash` call and one file each, in one same-turn batch.
4. When the task completes, read its one JSON object: `{status, sessionID, text, tokens, cost, exit_code, error}`. `status: ok` makes `sessionID` the worker's handle and `text` its ready reply. A ready turn that is `failed` (non-zero exit, an `error` event, or no `sessionID`) is a fallback: print one notice naming the agent and `error`, and create the worker through the `Agent` tool instead. The abandoned session needs no stop. A parallel batch matches each result to its worker by `sessionID`.

## Continue

Each later message is a new turn, never `SendMessage`: write the message to a new file in the message directory, then run `node <dispatch-path> continue --session <sessionID> --agent <name> --input-file <file> --cwd <project-root>` with `Bash` and `run_in_background: true`, and replace the kept task id with the new one. Start no turn while an earlier turn of the same worker still runs. The completed turn's `text` is the worker's message, read exactly like an `Agent` reply: a worker that reports through `@sai/policies/worker-report-transport.md` returns only its `{path, sha256}` reference, and the coordinator validates it as that policy says.

A turn that is `failed` after the ready turn is an ordinary obstacle of the coordinator's step, handled under `@sai/policies/obstacle-escalation.md` or the card's own recovery. The replacement worker is routed again from § Route.

## Warming

An opencode-routed agent receives no cache-warming switch: its messages end without the `Warming:` line, and its messages declare `warming: false`. It is never armed, so the coordinator's `warming` bookkeeping holds `false` for it.

## Reports and questions

The report directory is the one the coordinator opened under the Claude Code SAI temp root. The worker runs from the OpenCode install, so its tools would infer the OpenCode temp root. For that reason a task message to an opencode-routed worker that carries `--report-dir` has `--harness claude` as its second line, right after it, the envelope line that `@sai/policies/worker-report-transport.md` § Author boundary defines. A message without `--report-dir` (the ready prompt, for example) carries no such line, and the tool adds nothing to any message: it passes the file's text unchanged.

A worker question reaches the coordinator only as a `needs_input` report. No turn opens an interactive opencode prompt: the process has no input, and the tool never passes `--auto`, so a permission that asks is rejected and the turn continues or fails without blocking. The agent works with the permissions and tools of its OpenCode agent file, not the `tools:` list of its Claude Code file.

## Dispose

Dispose an opencode-routed agent at the points `@sai/policies/worker-lifecycle.md` lists. The stop is `TaskStop(task_id: "<kept Bash task id>")` on the shell of its running turn, issued in the same same-turn batch as the other stops of the point. With no turn running there is nothing to stop, and the worker counts as disposed; a `TaskStop` answered with `No task found` is a result. No `dispose` message and no `dispose-shells.js` call apply on Claude Code.
