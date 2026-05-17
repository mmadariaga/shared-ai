---
description: Granular implementation plan — reads OpenSpec change artifacts (proposal/design/tasks), writes implementation.md with code, RED→GREEN, STOP & COMMIT markers, to openspec/changes/{name}/implementation.md.
model: opencode-go/kimi-k2.6
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/proposal.md` exists. If not, STOP and print: "Change '{change-name}' not found. Run /sai-1-spec to create it first."
- `openspec/changes/{change-name}/design.md` exists. If not, STOP and print: "design.md not found for '{change-name}'. Run /sai-2-design first."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/caveman.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md

Also fetch @~/.config/opencode/instructions/sai/plan.md and follow those instructions exactly, with these REPLACEMENTS:

- Input is the change name `$ARGUMENTS`, not a path to `spec.md`.
- Read these artifacts from `openspec/changes/{change-name}/` (in parallel):
  - `proposal.md` — what & why
  - `design.md` — how
  - `tasks.md` — implementation steps (high-level)
  - any `specs/**/*.md` — capability deltas
- Treat the union of those artifacts as the equivalent of `spec.md`. If any field that `plan.md` expects from `spec.md` is missing, STOP and ask.
- Write the output to `openspec/changes/{change-name}/implementation.md`. Every reference to `plan.md` or the per-feature artifact directory in the loaded instructions resolves to `openspec/changes/{change-name}/implementation.md` and `openspec/changes/{change-name}/` respectively.
- Feature name is the change name (kebab-case).

Fetch @~/.config/opencode/instructions/sai/remember.md
