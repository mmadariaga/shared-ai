## Why

Every `sai-*` command currently duplicates the same prerequisite check block, and only 6 of 11 openspec-touching commands enforce it — the 5 that skip it (review/security/performance/accessibility/pr) will fail confusingly when openspec/ is absent. A new requirement (config.yaml must declare `schema: sai-workflow`) needs to land in one place, not be copy-pasted into every wrapper.

## What Changes

- Add new instruction file `instructions/sai/prereqs.md` containing the universal prereq checks (openspec binary, openspec/ directory, `schema: sai-workflow` line in `openspec/config.yaml`).
- Replace inline prereq blocks in the 6 wrappers that have them with a `Fetch @~/.claude/instructions/sai/prereqs.md` (or `~/.config/opencode/instructions/sai/prereqs.md` for opencode) directive.
- Add the same fetch directive to the 5 wrappers that currently skip the check (`sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`).
- `sai-commit` remains unchanged — it does not depend on openspec.
- Keep artifact-specific checks (approval gate, design.md existence, implementation.md existence) inline in the wrappers that need them.
- Install script copies `prereqs.md` to both `~/.claude/instructions/sai/` and `~/.config/opencode/instructions/sai/`.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `graceful-dependency-check`: adds third prereq check (`schema: sai-workflow` line in `openspec/config.yaml`), retitles checks for `sai-*` commands, and corrects scope — the 5 audit/PR wrappers (review/security/performance/accessibility/pr) now MUST perform the check, and `sai-commit` is the sole exemption.
- `command-wrappers`: requires the 11 openspec-touching wrappers to perform the prereq check via `Fetch @~/.claude/instructions/sai/prereqs.md` rather than inline blocks.
- `sai-instructions-namespace`: adds `prereqs.md` to the expected file list under `instructions/sai/`.

## Impact

- **Files added**: `instructions/sai/prereqs.md`.
- **Files modified**: `claude/commands/sai-1-spec.md`, `sai-2-design.md`, `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md`, `sai-archive.md`, `sai-explore.md`, `sai-pr.md` (and the mirrored `opencode/commands/sai-*.md` set).
- **Specs updated**: `graceful-dependency-check`, `command-wrappers`, `sai-instructions-namespace`.
- **Behavioral change for users**: any repo whose `openspec/config.yaml` lacks `schema: sai-workflow` will now fail the prereq with an actionable message before any sai-* command (except `sai-commit`) proceeds.
- **No code dependencies, APIs, or runtime systems affected** — change is limited to instruction files, command wrappers, and the install script's copy list (which already iterates the directory and needs no edit).
