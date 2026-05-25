## Why

Agents spawning bash/test/build subagents have no shared behavioral contract, leading to verbose output, unsolicited improvements, and inconsistent failure reporting. A dedicated executor skill provides disciplined execution rules that any agent can load without repeating the same prompt boilerplate.

## What Changes

- Add `skills/claude/executor/SKILL.md` — Claude Code executor skill (subagent_type: General, model: haiku)
- Add `skills/opencode/executor/SKILL.md` — OpenCode executor skill (agent keyword: `executor`)
- Add `agent.executor` entry to `opencode/opencode.jsonc` to register the executor agent

## Capabilities

### New Capabilities

- `executor-universal-behavior`: Shared behavioral rules for executor subagents — execute only what was requested, no self-correction, minimize output, batch independent commands, structured failure reporting
- `executor-claude-skill`: Claude Code harness binding — `subagent_type: General`, `model: haiku`, no tool-call cap, raw output allowed
- `executor-opencode-skill`: OpenCode harness binding — agent keyword `executor`, `agent.executor` registered in `opencode.jsonc` with cheap model, no tool-call cap

### Modified Capabilities

## Impact

- New files: `skills/claude/executor/SKILL.md`, `skills/opencode/executor/SKILL.md`
- Modified: `opencode/opencode.jsonc` (adds `agent.executor` block)
- No existing skills modified; parallel to existing `budget-explorer` pattern
- Downstream agents that load this skill via `Fetch` or `/skill executor` gain executor discipline without boilerplate
