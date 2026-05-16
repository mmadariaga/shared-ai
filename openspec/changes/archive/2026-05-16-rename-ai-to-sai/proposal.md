## Why

All commands use the prefix `/ai-*`, which conflicts with older versions of the prompts and doesn't reflect the project identity. Renaming to `/sai-*` (Shared AI) removes ambiguity and aligns commands with the project brand.

## What Changes

- All `claude/commands/ai-*.md` files renamed to `sai-*.md`
- All `github/prompts/ai-*.prompt.md` files renamed to `sai-*.prompt.md`
- All `opencode/commands/ai-*.md` files renamed to `sai-*.md`
- Internal references, `AGENTS.md`, `README.md`, and install guides updated to use `/sai-*`
- **BREAKING**: Users must update any saved shortcuts or aliases from `/ai-*` to `/sai-*`

## Capabilities

### New Capabilities

- `sai-command-naming`: Unified `/sai-*` prefix for all shared AI commands across Claude Code, GitHub Copilot, and OpenCode integrations

### Modified Capabilities

## Impact

- `claude/commands/` — 11 files renamed
- `github/prompts/` — 11 files renamed
- `opencode/commands/` — 14 files renamed (includes model variants)
- `AGENTS.md`, `README.md`, `INSTALL.claude.md`, `INSTALL.copilot.md` — reference updates
