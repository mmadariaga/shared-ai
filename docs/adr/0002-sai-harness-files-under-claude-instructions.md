# ADR 0002: Both harness resolver files live under ~/.claude/instructions/sai/

## Status

Superseded by [ADR 0004](./0004-source-layout-and-install-path-restructure.md)

## Context

OpenCode traditionally reads instructions from `~/.config/opencode/instructions/...`. Placing `explorer.opencode.md` under `~/.claude/instructions/sai/` deviates from that convention. The approved `explorer-opencode / harness-file-location` spec requirement names the path under `~/.claude/instructions/sai/` verbatim.

## Decision

Place both `explorer.claude.md` and `explorer.opencode.md` under `~/.claude/instructions/sai/`, honoring the approved spec path over the OpenCode harness convention.

## Alternatives Considered

- **Place `explorer.opencode.md` under `~/.config/opencode/instructions/sai/`** — Matches OpenCode convention but contradicts the approved spec. Spec compliance is binary for this iteration. Rejected.

## Consequences

- `explorer.opencode.md` is informational for this change — no sai command fetches it yet. Its physical location under `.claude` is harmless until an OpenCode sai wrapper is introduced.
- If an OpenCode sai wrapper is introduced in a future change, the file path may need to move to `~/.config/opencode/instructions/sai/` to match the OpenCode instruction search path.
