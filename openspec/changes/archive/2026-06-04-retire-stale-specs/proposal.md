## Why

11 specs in `openspec/specs/` reference paths and identifiers from a prior directory layout (`claude/commands/`, `opencode/commands/`, `instructions/sai/`) that was restructured to `commands/claude/`, `commands/opencode/`, `sai/instructions/`. Some also reference model identifiers that are no longer current. These stale references make specs misleading and unimplementable without manual correction.

## What Changes

- 4 specs whose described work is already complete are archived (removed from the active `openspec/specs/` tree)
- 7 specs with stale path or identifier references are updated in-place to reflect the current directory layout

## Capabilities

### New Capabilities

- `archive-completed-specs`: Identify and archive the 4 specs whose implementation work is demonstrably done; their presence in the active spec set creates false backlog
- `fix-stale-path-refs`: Update the 7 remaining stale specs to replace pre-restructure paths and obsolete model identifiers with their current equivalents

### Modified Capabilities

<!-- None -->

## Impact

- `openspec/specs/` — 4 directories archived, 7 spec files edited in-place
- No changes to production code, skills, or instruction files

## Proposal Research Documentation

**Local files**:
- `openspec/specs/dedup-numbered-wrappers/spec.md`
- `openspec/specs/dedup-nonnumbered-wrappers/spec.md`
- `openspec/specs/fix-remember-omissions/spec.md`
- `openspec/specs/rename-instructions-files/spec.md`
- `openspec/specs/sai-1-override-merge/spec.md`
- `openspec/specs/sai-instructions-dedup/spec.md`
- `openspec/specs/move-isolation-block/spec.md`
- `openspec/specs/explorer-opencode/spec.md`
- `openspec/specs/explorer-claude/spec.md`
- `openspec/specs/opencode-qwen-version/spec.md`
- `openspec/specs/opencode-model-resolution/spec.md`
- `commands/claude/` (directory listing — current layout)
- `commands/opencode/` (directory listing — current layout)
- `sai/instructions/` (directory listing — current layout)
- `openspec/config.yaml`
- `sai/instructions/spec.propose.md`

**External URLs**: none

## Additional Notes

**Completed specs confirmed by current state**:
- `rename-instructions-files` — `plan.md→implement.md, implement.md→apply.md` renames already reflected in `sai/instructions/` (no `plan.md` present)
- `opencode-qwen-version` — upgrade done per commit `5b95d17 chore(opencode): upgrade qwen to 3.7-plus`
- `opencode-model-resolution` — qwen3.6-plus migration complete; spec assertion trivially satisfied
- `sai-1-override-merge` — scope restriction override content is already present in `sai/instructions/spec.propose.md`

**Old → new path mapping** (applies across all stale specs):
| Old path | Current path |
|---|---|
| `claude/commands/` | `commands/claude/` |
| `opencode/commands/` | `commands/opencode/` |
| `instructions/sai/` | `sai/instructions/` |
| `.claude/commands/sai/` | `commands/claude/` or `commands/opencode/` |
| `instructions/sai/plan.md` | `sai/instructions/implement.md` |
| `instructions/sai/implement.md` | `sai/instructions/apply.md` |
