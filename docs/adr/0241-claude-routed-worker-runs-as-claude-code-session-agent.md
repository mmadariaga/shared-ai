# ADR 0241: A Claude-routed worker runs as the Claude Code session agent

<!-- adr-index: refs 0221; refs 0240 -->

## Status

Accepted.

## Context

ADR 0240 decides that an opencode coordinator dispatches a Claude-routed worker through `claude -p`. The remaining question is what the child runs as. Passing the worker's contract as prompt text would have to reproduce what a Claude Code agent file already carries: its `model`, `effort`, `tools:` list, and `permissionMode:`. A re-injected prompt loses all four and drifts from the installed agent definition.

## Decision

The child runs as the Claude Code session agent through `--agent`, which carries the installed agent file's contract, model, tools, and permission mode without re-injecting them.

The tool reads the Claude Code agent file of the same name (project `.claude/agents/` first, then the Claude Code global root) and passes its `tools:` value as `--allowedTools` and its optional `permissionMode:` as `--permission-mode`; both are needed on `--resume` turns as well, so `continue` re-reads the file. It never passes `--model` or `--effort`: those lines of the agent file apply. The opencode `model` and `variant` lines stay inert while the worker is routed, and setup states that when it writes the route.

## Alternatives Considered

- **Re-inject the worker contract as the prompt.** Rejected because it loses the agent file's model, effort, tools, and permission mode, and duplicates the contract.
- **Pass the model and effort explicitly per turn.** Rejected because the installed agent file already selects them, and a second source would drift.
- **Rely on `--resume` to restore the agent settings.** Rejected because permissions are attached to each turn; the tool passes the tool list and permission mode again.

## Consequences

- The route depends on a Claude Code agent file of the same name; without one, `route` falls back to opencode with a notice, and a first turn that still fails falls back to native creation.
- `--allowedTools` grants whole tools, not per-command rules.
- A Claude-routed worker works with the tools and permissions of its Claude Code file, not the opencode agent's permissions.

## Provenance

Change `claude-code-passthrough`, decision "The child runs as the Claude Code session agent through `--agent`".
