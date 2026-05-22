## Why

The sai skills reference "cheap research subagent" in `spec.propose.md` and `remember.md` without binding it to concrete subagent types or model parameters. Without an explicit `model:`, Claude Code subagents inherit the parent's Opus model, defeating cost discipline. This ports the vendor-specific resolver from the original project's harness wrappers into the sai instruction layer.

## What Changes

- Add `~/.claude/instructions/sai/explorer.claude.md` — binds "cheap research subagent" to `Explore` subagent with `model: haiku` (sonnet for multi-step synthesis), enforces tool-call caps, and defines task classification (lookup / synthesis / audit).
- Add `~/.claude/instructions/sai/explorer.opencode.md` — binds "cheap research subagent" to `explore` (lowercase) with model resolved via `opencode.jsonc`; simplified caps; no task classification (not present in original opencode harness).
- Update `~/.claude/commands/sai-1-spec.md` — insert `Fetch @~/.claude/instructions/sai/explorer.claude.md` as the first line in the Load behaviors block.
- Update `~/.claude/commands/sai-2-design.md` — same fetch insertion in Load behaviors.
- Update `~/.claude/commands/sai-3-implement.md` — same fetch insertion in Load behaviors.

## Capabilities

### New Capabilities

- `explorer-claude`: Claude Code harness subagent resolver — maps "cheap research subagent" to `Explore` + haiku/sonnet model, enforces per-mode tool-call caps, defines task classification (lookup / synthesis / audit) and the NEVER-omit-model rule.
- `explorer-opencode`: OpenCode harness subagent resolver — maps "cheap research subagent" to `explore` (lowercase) with model from `opencode.jsonc`, simplified caps, no task classification.

### Modified Capabilities

- `sai-skills-fetch-update`: sai-1-spec, sai-2-design, and sai-3-implement command files — add `Fetch @~/.claude/instructions/sai/explorer.claude.md` as the first behavior loaded in each skill's Load behaviors block.

## Impact

- Files created: `~/.claude/instructions/sai/explorer.claude.md`, `~/.claude/instructions/sai/explorer.opencode.md`
- Files modified: `~/.claude/commands/sai-1-spec.md`, `~/.claude/commands/sai-2-design.md`, `~/.claude/commands/sai-3-implement.md`
- `spec.propose.md` is not modified — remains harness-agnostic.
- No API changes, no external dependencies, no schema changes.
- Existing sai skills that ran without `explorer.claude.md` will now inherit explicit subagent routing; the prior behavior (unresolved Opus inheritance) is superseded.
