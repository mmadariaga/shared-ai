## Why

`tasks.md` currently uses checkbox format (`- [ ]`) but `sai-3-implement` generates `implementation.md` with the real granular checkboxes — so tasks.md checks are never updated, causing `sai-archive` to always warn about incomplete tasks. Three additional defects exist in the same workflow boundary: `sai-explore` may suggest creating a proposal inline (breaking context isolation), `sai-2-design` references a non-existent skill (`openspec-continue`), and `apply.tracks` in the schema still points at `tasks.md`.

## What Changes

- `tasks.md` changes from a checkbox implementation checklist to a narrative scaffold (steps, files affected, testing strategy) with no `- [ ]` markers.
- `sai-archive` checks `implementation.md` for incomplete checkboxes instead of `tasks.md`; if `implementation.md` does not exist, the check is skipped entirely.
- `sai-explore` is prohibited from creating a proposal inline; when an idea crystallizes it offers a structured summary block for the user to paste into `/sai-1-spec` in a new session.
- `sai-2-design` removes the dead reference to `.claude/skills/openspec-continue/SKILL.md` (package name is `openspec-continue-change`, not installed) and embeds generation instructions directly in the wrapper.
- `openspec/schemas/sai-workflow/schema.yaml` is updated: tasks artifact instruction drops checkbox language; `apply.tracks` changes from `tasks.md` to `implementation.md`.

## Capabilities

### New Capabilities

_(none — all changes modify existing capabilities)_

### Modified Capabilities

- `tasks-scaffold-format`: tasks.md description and instruction rewritten as a narrative scaffold — Steps with Files Affected, What Will Be Done, Testing Strategy sections; no `- [ ]` checkboxes.
- `implementation-progress-tracking`: sai-archive and schema `apply.tracks` rewired to track `implementation.md` completion instead of `tasks.md`.
- `explore-context-isolation`: sai-explore OVERRIDE added to suppress inline proposal creation; replaces the offer with a paste-ready summary block.
- `sai-2-design-skill-fix`: dead `openspec-continue` skill reference removed; generation logic embedded directly in the sai-2-design wrappers.

## Impact

- `openspec/schemas/sai-workflow/schema.yaml` — tasks instruction text + `apply.tracks` value
- `claude/commands/sai-2-design.md` — remove dead skill reference, embed design+tasks generation instructions
- `claude/commands/sai-archive.md` — OVERRIDE: check `implementation.md` instead of `tasks.md`
- `claude/commands/sai-explore.md` — OVERRIDE: prohibit inline proposal creation
- `opencode/commands/sai-2-design.md` — mirror of claude counterpart
- `opencode/commands/sai-archive.md` — mirror of claude counterpart
- `opencode/commands/sai-explore.md` — mirror of claude counterpart
- No changes to `.claude/skills/openspec-*/` (read-only, from openspec package)
- No runtime dependency changes
