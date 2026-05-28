## Why

`budget-executor` binds a cheap subagent to shell command execution, but there is no equivalent binding for general-purpose task delegation — cases where the caller wants to hand off a complete task (file operations, searches, writes, code analysis) and receive a concise outcome report. `budget-subagent` fills this gap with the same cost-discipline pattern but scoped to tasks rather than commands.

## What Changes

- Add `skills/claude/budget-subagent/SKILL.md` — Claude Code variant (binds to `subagent_type: General, model: haiku`)
- Add `skills/opencode/budget-subagent/SKILL.md` — Opencode variant (binds to new `subagent` agent keyword)
- Add `"subagent"` entry to `configs/opencode.jsonc` under `agent`
- Update `skills/universal/budget/SKILL.md` — load `budget-subagent` alongside `budget-executor`
- Update `INSTALL.claude.md` — add copy steps for `budget-subagent`
- Update `INSTALL.opencode.md` — add copy steps for `budget-subagent` + document the new `agent.subagent` config section
- Update `bin/install-flow.js` — add `budget-subagent` copy calls in `installClaude()` and `installOpencode()`; add `subagent` block to the `copyOpencodeConfig()` printed snippet

## Capabilities

### New Capabilities

- `budget-subagent-behavior`: Universal behavioral rules — execute one task, no scope expansion, structured completion report (status / actions_taken / failures), tool-call soft cap.
- `budget-subagent-platform-bindings`: Platform-specific bindings — Claude Code (`subagent_type: General, model: haiku`) and Opencode (`subagent` agent keyword in opencode.jsonc with model via config).
- `install-distribution`: Install doc updates (INSTALL.claude.md + INSTALL.opencode.md), automated installer update (bin/install-flow.js), and registry update (budget/SKILL.md).

### Modified Capabilities

- `budget-universal-loader`: `skills/universal/budget/SKILL.md` gains a new `Fetch @skills/budget-subagent/SKILL.md` line so the umbrella `budget` skill activates all four cost-discipline bindings.

## Impact

- **New files**: `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`
- **Modified files**: `configs/opencode.jsonc`, `skills/universal/budget/SKILL.md`, `INSTALL.claude.md`, `INSTALL.opencode.md`, `bin/install-flow.js`
- **No breaking changes** — existing `budget-executor` behavior is unchanged; this is an additive sibling skill
- **Opencode users who already installed** must manually add the `"subagent"` block to their `opencode.jsonc` (documented in install guide)

## Proposal Research Documentation

**Local files**:
- `skills/claude/budget-executor/SKILL.md`
- `skills/opencode/budget-executor/SKILL.md`
- `skills/universal/budget/SKILL.md`
- `INSTALL.claude.md`
- `INSTALL.opencode.md`
- `configs/opencode.jsonc`
- `bin/install-flow.js`
- `.opencode/skills/openspec-apply-change/SKILL.md` (opencode skill format reference)

**External URLs**: none

## Additional Notes

- The `executor` keyword already exists in `opencode.jsonc`; `subagent` is a new parallel entry with the same `mode: "subagent"` shape.
- `budget-executor` keeps `raw output: allowed` because compiler errors and exit codes are the answer. `budget-subagent` uses a structured report because the caller needs an outcome summary, not a log dump.
- Tool-call cap guidance for `budget-subagent`: soft cap of ~30 calls. Unlike executor (unbounded because commands are discrete), tasks can involve extended multi-step work that needs a ceiling to prevent drift.
- Both skill files share identical behavioral rules; only the "Binding" section differs per platform — the implementer should draft the universal behavior once and copy it.
