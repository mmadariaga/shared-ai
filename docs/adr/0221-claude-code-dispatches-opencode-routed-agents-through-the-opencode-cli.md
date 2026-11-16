# ADR 0221: Claude Code dispatches opencode-routed agents through the OpenCode CLI

<!-- adr-index: amends 0077; amends 0133 -->

## Status

Accepted. Amends ADR 0077 and ADR 0133: dispatch is no longer always harness-native, because a Claude Code coordinator can now run an agent through the OpenCode CLI. Both records stay in force for every other dispatch and are not edited, because existing records are never edited in place. The dispatch is stated in `sai/policies/opencode-dispatch.md`.

## Context

ADR 0077 and ADR 0133 keep dispatch and continuation mechanics in harness-native bindings: Claude Code dispatches through `Agent` and `SendMessage`, opencode through its own subagent call. With Claude Code as the main harness, every worker and helper therefore runs on an Anthropic model chosen by its Claude Code agent file. Users who prefer Claude Code as their harness, but want selected workers on cheaper non-Anthropic models, had no per-worker choice. The earlier closure of issue 196 covered only the reverse case, opencode using a Claude subscription. The routed workers carry most of the spend, so the lever has to cover them as well as the generic helpers.

A disposable proof of concept on opencode v2.3.0 showed that one `opencode run --format json` process per turn, continued with `--session`, exposes the `sessionID` in its first output event, keeps context across turns, never blocks on a permission that asks, and starts in 2.3 to 3.8 seconds. A server variant (`opencode serve` with `opencode run --server`) gave the same results with no timing gain and needs `OPENCODE_PASSWORD`.

## Decision

1. **A separate routing key selects the route.** An agent whose Claude Code agent file carries `harness: opencode` is an opencode-routed agent. The key is a user-owned tunable: `CLAUDE_TUNABLE_KEYS` includes `harness`, so install and `doctor` keep a hand-set line and report no drift for it. No template, preset, or installer writes the line. `model:` stays a valid Claude fallback. With opencode as the main harness nothing changes, and the key exists only in Claude Code agent files. Agents without the key, or with `harness: claude`, dispatch through `Agent` exactly as before.
2. **`sai/tools/opencode-dispatch.js` owns the dispatch.** `route --agent <name>` reads `harness:` from the agent file Claude Code resolves (project `.claude/agents/` first, then the global root), checks that the `opencode` binary runs and lists an agent of the same name, and prints `claude` or `opencode` with the cause. `start` and `continue` run one `opencode run --format json` turn and print `sessionID`, the final text, `tokens`, `cost`, and the exit code. The model comes from the OpenCode agent of the same name, so the Claude Code `tools:` list and permissions do not apply.
3. **One process per turn, with `--session`.** The `sessionID` of the first output event is the worker's handle, and each continuation is a new background `opencode run --session <sessionID>`. The message travels in a file written into a `transfer.js open` directory and reaches opencode as one spawn argument after `--`, with no shell, so free text is never re-quoted and a message that starts with `--` is not read as an option. The process gets no input, and the tool never passes `--auto`: a permission that asks is rejected without hanging the turn, while `--auto` would approve everything not hard-denied.
4. **A missing prerequisite or a failed ready turn falls back to Claude Code.** When the binary or the same-named agent is missing, `route` answers `claude` with a notice naming the agent and the cause. A ready turn that fails (non-zero exit, an `error` event, or no `sessionID`) creates the worker through `Agent` with the same notice. A failure after ready is an ordinary coordinator obstacle, and the replacement worker is routed again.
5. **The coordinator runs the turns in the background and disposes with `TaskStop`.** It starts each turn with `Bash` and `run_in_background: true`, keeps the `sessionID` and the task id of the running turn, and matches parallel results by `sessionID`. Disposing stops the shell of the running turn with `TaskStop`; with no turn running there is nothing to stop. The coordinator profile may run the tool through a shell rule in `sai/install-manifest.json`.
6. **An opencode-routed agent receives no cache warming.** Its messages carry no warming switch and declare `warming: false`.
7. **Reports reach the Claude Code temp root, and the harness hint is an envelope line.** The worker runs from the OpenCode install, so its tools would infer the OpenCode temp root, while the coordinator's report directory lives under the Claude Code one. `bin/capabilities.js` grants opencode agents `external_directory` on the Claude Code SAI temp root, so the report write succeeds without `--auto`. The hint that tells the worker to use `--harness claude` travels as an optional second task-disclosure line, `--harness <claude|opencode>`, right after `--report-dir`, defined in `sai/policies/worker-report-transport.md` § Author boundary. The worker strips it, keeps it for its continuations, and passes it to its `temp-root.js` and `transfer.js` calls. The coordinator adds it only to tasks that carry `--report-dir`, and the tool adds nothing to any message. A worker question still reaches the coordinator only as a `needs_input` report.

The first design had the tool append the hint as a free-standing instruction line to every message. A live opencode agent rejected it as an injected, unauthorized directive and refused the task, so the hint moved into the envelope line that the worker contract itself recognizes.

## Alternatives Considered

- **`opencode serve` plus `opencode run --server <url>`** — rejected: equal behavior and no startup gain, with an extra password and a server lifecycle to manage.
- **A sentinel value in `model:`** — rejected: it breaks `model:` as the Claude fallback and confuses dispatch paths that do not know the routing.
- **Covering only the generic helpers or only `budget-explorer`** — rejected: the routed workers carry most of the spend.
- **Appending the harness hint to every message from the tool** — rejected after a live run, where the agent treated the appended line as an injection.

## Consequences

- Dispatch is no longer always harness-native: ADR 0077 and ADR 0133 describe every dispatch except the opencode-routed one, which this record qualifies. The cost is one more route to keep in step with the binding templates, the three Claude Code budget skills, and the design overview step, which now point to the single policy.
- Each turn pays about 2 to 4 seconds of process startup, and an opencode-routed agent is never cache-warmed.
- The agent's effective permissions are those of its OpenCode agent file. An OpenCode `shell` deny is not a sandbox, because a model can use the `execute` code tool instead.
- Behavior with several concurrent `opencode run` processes on one service, cost reporting for a priced model, and killing a `run --server` client were not verified by the proof of concept. Per-worker token attribution in telemetry is out of scope for this change.
- The opencode agent files projected on Linux now name the Claude Code temp root of the installing user, `/tmp/claude-{uid}/sai/*`, so they are machine-specific in the way the generated shell rules already are.

## Provenance

Change `opencode-worker-dispatch`, decision "Claude Code dispatches opencode-routed agents through the OpenCode CLI".
