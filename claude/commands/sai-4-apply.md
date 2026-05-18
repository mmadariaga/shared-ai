---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @~/.claude/instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

Do not create or modify any files if this check fails.

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

Fetch @~/.claude/instructions/sai/apply.md and follow those instructions exactly. User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
