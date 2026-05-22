## Why

The current layout mixes sai-owned payload (`commands/sai/`, `instructions/sai/`), harness-specific wrappers (`claude/commands/`, `opencode/commands/`), and vendor config (`opencode/opencode.jsonc`) at different root locations with inconsistent naming conventions. Grouping them by ownership — `sai/` for universal content, `commands/{claude,opencode}/` for harness packages, `configs/` for config samples — makes the boundary explicit and eliminates the ambiguous `claude/` top-level directory.

## What Changes

- `claude/commands/` → `commands/claude/` (harness wrappers grouped under `commands/`)
- `opencode/commands/` → `commands/opencode/` (harness wrappers grouped under `commands/`)
- `commands/sai/` → `sai/commands/` (sai payload under `sai/`)
- `instructions/sai/` → `sai/instructions/` (sai payload under `sai/`)
- `opencode/opencode.jsonc` → `configs/opencode.jsonc` (config samples isolated)
- Empty `opencode/` and `claude/` directories removed after moves
- Install source paths in `README.md` and `INSTALL.claude.md` updated for `sai/commands/` and `sai/instructions/`; install destinations for those two change to `~/.claude/sai/commands/` and `~/.claude/sai/instructions/`
- All 24 wrapper files (`commands/claude/*.md`, `commands/opencode/*.md`) updated: `@commands/sai/` → `@sai/commands/`, `@instructions/sai/` → `@sai/instructions/`
- `AGENTS.md` structure table and Fetch convention section updated to reflect new paths
- ADR 0003 amended: decision and rationale updated to `@sai/commands/` convention

**No breaking changes to install destinations for wrappers or opencode.jsonc.** The harness install destinations (`~/.claude/commands/`, `~/.config/opencode/commands/`, `~/.config/opencode/opencode.jsonc`) are unchanged. Only the sai payload destinations change.

## Capabilities

### New Capabilities

- `source-layout`: Rename four directories and one file via `git mv`; remove empty `opencode/` and `claude/` parent directories after moves.
- `install-script`: Update source paths and sai payload destinations in `README.md` and `INSTALL.claude.md`. New sai destinations: `~/.claude/sai/commands/` and `~/.claude/sai/instructions/`.
- `wrapper-fetch-paths`: Update Fetch directives in all 24 wrappers (`commands/claude/*.md`, `commands/opencode/*.md`) — `@commands/sai/` → `@sai/commands/`, `@instructions/sai/` → `@sai/instructions/`.
- `docs-sync`: Update `AGENTS.md` structure table and Fetch convention section; amend `docs/adr/0003-fetch-path-convention-commands-sai.md` to reflect new convention.

### Modified Capabilities

## Impact

- **Affected files**: `claude/commands/*.md` (12 files), `opencode/commands/*.md` (13 files), `commands/sai/*.md` (12 files), `instructions/sai/*.md` (15 files), `opencode/opencode.jsonc`, `README.md`, `INSTALL.claude.md`, `AGENTS.md`, `docs/adr/0003-fetch-path-convention-commands-sai.md`
- **No application code changes**: only documentation, wrapper markdown, and directory structure
- **Users must re-run install** after this change to update sai payload destinations; wrapper/config destinations are unchanged
- **`skills/`** directory and its install destination are unaffected
- **OpenSpec schemas, specs, and change artifacts** are unaffected
