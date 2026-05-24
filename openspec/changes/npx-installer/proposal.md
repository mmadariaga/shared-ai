## Why

Users currently install shared-ai manually by cloning the repo and copying files. An `npx` installer removes that friction and enables one-command setup from GitHub without an npm registry.

## What Changes

- Add `package.json` at repo root with `bin`, `files`, and `engines` fields
- Add `bin/install.js` — zero-dep Node.js installer script
- Installer presents an interactive terminal checklist (Claude Code / Opencode) using `readline` only
- File copy logic follows per-type rules: skills skip-if-exists, instructions overwrite+warn, commands always overwrite
- `opencode.jsonc` skipped if config already present; manual instructions printed instead
- Post-install reminder printed for `openspec init` and schemas copy

## Capabilities

### New Capabilities

- `npx-installer`: Interactive Node.js installer that lets users select Claude Code and/or Opencode targets via a terminal checklist, then copies the appropriate files to the correct OS-aware destinations

### Modified Capabilities

_(none)_

## Impact

- **New files**: `package.json`, `bin/install.js`
- **No existing files modified**
- **Dependencies**: Node.js ≥ 18 (built-ins only: `fs`, `path`, `os`, `readline`)
- **Affected destinations**: `~/.claude/` and `~/.config/opencode/` on target machines

## Proposal Research Documentation

**Local files**:
- `commands/claude/` — 14 .md files (source for Claude commands)
- `commands/opencode/` — 14 .md files (source for Opencode commands)
- `skills/universal/` — budget/, caveman/, token-efficient-languages/
- `skills/claude/` — budget-executor/, budget-explorer/, fetch/
- `skills/opencode/` — budget-executor/, budget-explorer/, fetch/
- `sai/commands/` — 13 .md files
- `sai/instructions/` — 17 .md files
- `configs/opencode.jsonc` — exists

**External URLs**: _(none — pure Node.js built-ins, no external API research required)_
