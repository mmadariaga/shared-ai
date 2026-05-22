## Why

The shared-AI pipeline (`ai-*` commands) and OpenSpec (`opsx:*` commands) evolved independently to solve overlapping problems: both orchestrate AI through planning and implementation phases. This duplication means improvements in one system don't benefit the other, and users must choose between two incomplete pipelines. Integrating them eliminates the overlap by specializing each: OpenSpec owns the lifecycle and artifact structure, shared-AI owns the quality layer and model routing.

## What Changes

- `ai-*` commands become wrappers over OpenSpec skills — they add caveman mode, isolation, model routing, and content enrichment on top of opsx behavior
- `ai-2-plan` renamed to `ai-2-implement` (produces `implementation.md` — granular theoretical plan for cheap-model execution)
- `ai-3-implement` renamed to `sai-4-apply` (reads `implementation.md`, executes mechanically with cheap model)
- `ai-0-explore` renamed to `ai-explore` (unnumbered, optional step)
- `ai-archive` added as new wrapper for `opsx:archive`
- All artifacts (`review.md`, `security.md`, `performance.md`, `accessibility.md`, `implementation.md`) move from `plans/{name}/` to `openspec/changes/{name}/`
- `plans/` directory eliminated from pipeline
- OpenSpec CLI + `openspec init` become hard dependencies (with graceful error if missing)
- shared-AI install script no longer bundles OpenSpec skills (CLI owns them, versioned)
- **BREAKING**: `plans/` directory no longer used — existing `plans/` artifacts are not migrated automatically

## Capabilities

### New Capabilities

- `command-wrappers`: ai-* commands wrap opsx skills, layering shared-AI quality behaviors (caveman, isolation mode, model routing, spec.common enrichment) over OpenSpec skill logic without modifying skill files
- `openspec-artifact-home`: all ai-* artifacts write to and read from `openspec/changes/{name}/` — single source of truth per change
- `graceful-dependency-check`: ai-* commands verify openspec CLI is installed and project is initialized before proceeding; clear actionable error if not

### Modified Capabilities

- `install-script`: updated to NOT copy skills to `~/.claude/skills/` — skills come from openspec CLI only

## Impact

- `claude/commands/`: all ai-* command files updated
- `opencode/commands/`: mirrored changes for opencode platform
- `instructions/spec.common.md`: adapted for use inside opsx:propose wrapper (avoid contradictions with skill instructions)
- `INSTALL.claude.md`, `INSTALL.opencode.md`: updated prerequisites (openspec CLI required)
- `AGENTS.md`, `README.md`: pipeline diagram and artifact paths updated
- Users with existing `plans/` directories: **BREAKING** — must migrate manually or keep old commands for legacy changes
