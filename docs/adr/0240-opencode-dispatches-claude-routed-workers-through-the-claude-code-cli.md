# ADR 0240: Opencode dispatches Claude-routed workers through the Claude Code CLI

<!-- adr-index: pair with 0221 -->

## Status

Accepted. Pairs with ADR 0221, which routes a Claude Code agent through the OpenCode CLI; this record is the inverse direction, and neither replaces the other.

## Context

ADR 0221 gives a Claude Code coordinator a per-worker route to opencode. The inverse did not exist: an opencode session always ran its SAI workers inside opencode, because opencode's native `subagent` call reaches only opencode agents, so no opencode step could use the model, tools, permission mode, and plan mode of a Claude Code agent without moving the whole session.

A worker is routed by its own opencode agent file: a `harness: claude` line makes it a Claude-routed worker, and an absent line or any other value keeps it native. The route key is a user-owned tunable on both harnesses.

## Decision

Dispatch is an external tool the coordinator runs, because opencode's native subagent dispatch reaches only opencode agents.

`sai/tools/claude-dispatch.js` owns it. `route --agent <name>` reads `harness:` from the opencode agent file (project `.opencode/agents/` first, then the opencode global root), then requires the `claude` binary, a signed-in `claude auth status` session, and a Claude Code agent file of the same name, and prints `claude` or `opencode` with the cause and a notice on the fallback. `start` runs one `claude -p --agent <name> --output-format json --session-id <uuid>` turn and returns the `sessionID` as the handle; `continue` runs `claude -p --resume <uuid> --output-format json`; `stop --session <uuid>` ends the turn. The message travels on the child's stdin, so free text is never re-quoted, and `--model` and `--effort` are never passed.

A turn holds a per-session lock at `<opencode SAI temp root>/claude-turns/<sessionID>.lock`, holding the tool's PID; `start` takes the lock of the UUID it creates and every `continue` takes its session's, so a second turn of the worker is refused with `status: busy` (exit 3) and sends nothing. The POSIX child leads its own process group and its PID is recorded beside the lock, so `stop` kills the group and not just the tool. The lock and the route-key reader are shared with `opencode-dispatch.js` through `sai/tools/dispatch-common.js`.

`sai/policies/claude-dispatch.md` is the single source of the route, create, continue, warming, reports, and dispose rules. The opencode routed-worker binding template queries the route before every creation, and continues and stops a routed worker through that policy. Reports still travel through `@sai/policies/worker-report-transport.md`: the task message carries `--harness opencode` after `--report-dir`, and the worker returns its `{path, sha256}` reference.

## Alternatives Considered

- **Phase-level handoff.** Rejected because it loses per-step routing and creates a second coordinator inside Claude Code.
- **An ad-hoc `claude -p` skill.** Rejected because it has no worker contract, route key, or report transport.
- **An MCP or SDK bridge.** Rejected as a heavier integration surface with no SAI shape.
- **Re-injecting the worker contract into a plain `claude -p` prompt.** Rejected because it loses the Claude Code agent file's model, effort, tools, and permission mode; ADR 0241 records the agent-file route.

## Consequences

- Each turn adds a few seconds of process startup.
- A Claude-routed worker gets no cache warming and declares `warming: false`.
- A tool call outside the Claude Code `tools:` list is denied instead of prompting, because a `claude -p` turn cannot ask.
- The child's cost stays outside the opencode run's telemetry; the dispatcher returns each turn's `tokens` and `cost`.
- The worker's helpers run as Claude Code helpers and end with the turn that stops the worker.
- With Claude Code as the main harness nothing changes.

## Provenance

Change `claude-code-passthrough`, decision "Dispatch is an external tool the coordinator runs".
