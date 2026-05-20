---
description: Granular implementation plan — reads OpenSpec change artifacts (proposal/design/tasks), writes implementation.md with code, RED→GREEN, STOP & COMMIT markers, to openspec/changes/{name}/implementation.md.
argument-hint: "[change-name]"
model: claude-sonnet-4-6
effort: high
---

Fetch @instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/proposal.md` exists. If not, STOP and print: "Change '{change-name}' not found. Run /sai-1-spec to create it first."
- `openspec/changes/{change-name}/design.md` exists. If not, STOP and print: "design.md not found for '{change-name}'. Run /sai-2-design first."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md

Fetch @instructions/sai/implement.md and follow those instructions exactly. User input: $ARGUMENTS

Fetch @instructions/sai/remember.md
