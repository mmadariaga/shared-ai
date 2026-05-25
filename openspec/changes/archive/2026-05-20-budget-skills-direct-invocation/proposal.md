## Why

Budget skills (explorer + executor) only activate when the main agent autonomously decides to delegate — users have no explicit handle to force them individually or together. Adding trigger phrases and slash commands gives users direct control.

## What Changes

- `skills/claude/budget-explorer/SKILL.md` — trigger phrases added to `description` frontmatter field
- `skills/claude/budget-executor/SKILL.md` — trigger phrases added to `description` frontmatter field
- `skills/opencode/budget-explorer/SKILL.md` — trigger phrases added to `description` frontmatter field
- `skills/opencode/budget-executor/SKILL.md` — trigger phrases added to `description` frontmatter field
- `claude/commands/budget.md` — new slash command: loads both claude budget skills simultaneously
- `opencode/commands/budget.md` — new slash command: loads both opencode budget skills simultaneously

## Capabilities

### New Capabilities

- `claude-budget-explorer-triggers`: Trigger phrases in `skills/claude/budget-explorer/SKILL.md` description that enable auto-discovery on phrases like "use explorer", "delegate research", "run cheap subagent", etc.
- `claude-budget-executor-triggers`: Trigger phrases in `skills/claude/budget-executor/SKILL.md` description that enable auto-discovery on phrases like "use executor", "spawn executor", "run command subagent", etc.
- `opencode-budget-explorer-triggers`: Same trigger phrase enhancement for `skills/opencode/budget-explorer/SKILL.md`.
- `opencode-budget-executor-triggers`: Same trigger phrase enhancement for `skills/opencode/budget-executor/SKILL.md`.
- `claude-budget-command`: `/budget` slash command for Claude Code that fetches both claude budget SKILL.md files by reference — no binding semantics duplicated.
- `opencode-budget-command`: `/budget` slash command for OpenCode that fetches both opencode budget SKILL.md files by reference — no binding semantics duplicated.

### Modified Capabilities

## Impact

- 4 SKILL.md `description` frontmatter fields updated (trigger phrases only — no behavior changes)
- 2 new command files: `claude/commands/budget.md`, `opencode/commands/budget.md`
- No changes to model bindings, tool-call caps, or output contract rules (those remain in SKILL.md only)
- No changes to install scripts, CI, or infrastructure
