## ADDED Requirements

### Requirement: sai-payload-directory
The repository SHALL contain a `sai/` top-level directory with `sai/commands/` holding command cards — routed cards (`coordinator.md`, `worker.md`, `invocation.md`) and utility cards (`body.md`) — each with command-local phase content folded in as `sai/commands/{name}/instructions.md` and neighboring `.template.md` files (e.g. `sai/commands/review/review-report.template.md`). Three root exceptions live at the `sai/` root: `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`. There is no maintained `sai/instructions/` tree; phase content is folded into the command directories.

#### Scenario: command cards and folded instructions exist at the folded paths
- **WHEN** the fold is applied
- **THEN** command cards exist under `sai/commands/{name}/` and every phase's instruction content is present at `sai/commands/{name}/instructions.md` with its co-located `.template.md` files

#### Scenario: no maintained sai/instructions tree remains
- **WHEN** the fold is applied
- **THEN** no file lives under a maintained `sai/instructions/` tree; the shared overview-generation instruction is at `sai/change-overview.md` and the index templates at `sai/adr-index.template.md` and `sai/ddr-index.template.md`

### Requirement: harness-wrappers-directory
The repository SHALL contain `commands/claude/` (wrappers for Claude Code) and `commands/opencode/` (wrappers for OpenCode), grouping all harness wrapper packages under a single `commands/` root.

#### Scenario: claude wrappers at new path
- **WHEN** the restructure is applied
- **THEN** all files previously at `claude/commands/*.md` SHALL be present at `commands/claude/*.md` with identical content

#### Scenario: opencode wrappers at new path
- **WHEN** the restructure is applied
- **THEN** all files previously at `opencode/commands/*.md` SHALL be present at `commands/opencode/*.md` with identical content

### Requirement: configs-directory
The repository SHALL contain `configs/opencode.jsonc`. The `opencode/` directory SHALL NOT exist after the restructure.

#### Scenario: opencode config at new path
- **WHEN** the restructure is applied
- **THEN** `configs/opencode.jsonc` SHALL exist with the same content as the previous `opencode/opencode.jsonc`

#### Scenario: old directories removed
- **WHEN** the restructure is applied
- **THEN** `claude/`, `opencode/`, `commands/sai/`, and `instructions/sai/` SHALL NOT exist in the repository

### Requirement: git-history-preserved
All file moves SHALL be performed as `git mv` operations so that file history is preserved in git log.

#### Scenario: history survives move
- **WHEN** `git log --follow sai/commands/sai-1-spec.md` is run after the restructure
- **THEN** commits predating the restructure SHALL appear in the output

### Requirement: skills-unchanged
The `skills/` directory and all its contents SHALL remain at their current paths. No files under `skills/` SHALL be moved.

#### Scenario: skills path intact
- **WHEN** the restructure is applied
- **THEN** `skills/` SHALL contain the same files at the same relative paths as before

## MODIFIED Requirements

## REMOVED Requirements
