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

Fetch @~/.config/opencode/instructions/sai/explorer.opencode.md
Fetch @~/.config/opencode/instructions/sai/caveman.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md

Also fetch @~/.config/opencode/instructions/sai/plan.md and follow those instructions exactly, with these REPLACEMENTS:

- Input is the change name `$ARGUMENTS`, not a path to `spec.md`.
- Read these artifacts from `openspec/changes/{change-name}/` (in parallel):
  - `proposal.md` — what & why
  - `design.md` — how
  - `tasks.md` — implementation steps (high-level)
  - any `specs/**/*.md` — capability deltas
- STOP condition: if `tasks.md` lacks `## Implementation Context` entirely, STOP and print: "Implementation Context missing from tasks.md for '{change-name}'. Re-run /sai-2-design or add the section manually before /sai-3-implement."
- Read `## Required Documentation` from `tasks.md` as the equivalent of `spec.md`'s Required Documentation. Read every file and URL listed there; do not perform additional codebase exploration to recover this information.
- Read `## Implementation Context` (**Stack**, **Conventions**, **Avoid**) from `tasks.md` as the equivalent of `plan.md`'s Expertise Profile. Treat these three fields as the complete Expertise Profile contract. Do NOT require a separate Primary Role / Technologies & Libraries / Standards / Output Quality Bar block. Do NOT STOP on missing Expertise Profile subsections. Do NOT perform codebase exploration to recover stack or convention information.
- Write the output to `openspec/changes/{change-name}/implementation.md`. Every reference to `plan.md` or the per-feature artifact directory in the loaded instructions resolves to `openspec/changes/{change-name}/implementation.md` and `openspec/changes/{change-name}/` respectively.
- Feature name is the change name (kebab-case).

MANDATORY STOP: Once implementation.md is written, your work is COMPLETE. Do NOT execute any steps, run verification commands, mark any checkboxes, or modify any project file. That is sai-4-apply's job.

Fetch @~/.config/opencode/instructions/sai/remember.md
