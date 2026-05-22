## Why

Claude Code has no `Fetch @<path>` resolution skill for its own config paths (`.claude/` / `~/.claude/`). When sai-* commands reference `@sai/instructions/...`, Claude knows how to load skills but has no rule for resolving `@sai/` paths and fails silently or searches the wrong directories.

## What Changes

- Add `skills/claude/fetch/SKILL.md` — a Claude Code–specific fetch resolution skill, adapted from `skills/opencode/fetch/SKILL.md`.
- Resolution table maps `Fetch @<subpath>` to `.claude/<subpath>` (project) then `~/.claude/<subpath>` (global), matching Claude Code's actual config layout.
- Skills path (`Fetch @skills/<name>/SKILL.md`) resolves via the `Skill` tool, same as opencode.
- Add fetch skill loading directive to all `commands/claude/*.md` wrappers — mirrors the `Load skill fetch before you continue.` line already present in every `commands/opencode/*.md` wrapper.
- Update `INSTALL.claude.md` to copy `skills/claude/fetch/SKILL.md` → `~/.claude/skills/fetch/SKILL.md` (same pattern as existing skill installs).

## Capabilities

### New Capabilities
- `claude-fetch-resolution`: Teach Claude Code how to resolve `Fetch @<subpath>` references — project `.claude/` first, global `~/.claude/` fallback — plus `@skills/` via the `Skill` tool.

### Modified Capabilities
- `claude-commands-fetch-load`: All `commands/claude/*.md` wrappers gain a `Fetch @skills/fetch/SKILL.md` line before their main `Fetch @sai/...` directive so the resolution rules are active before they are needed.
- `claude-install`: `INSTALL.claude.md` gains a step to copy the fetch skill into `~/.claude/skills/fetch/`.

## Impact

- New file: `skills/claude/fetch/SKILL.md`
- Modified files: all 14 `commands/claude/*.md` wrappers (add one line each)
- Modified file: `INSTALL.claude.md` (add skill copy step in both Linux/macOS and Windows sections)
