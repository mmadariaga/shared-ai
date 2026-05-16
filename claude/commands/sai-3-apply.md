---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"
3. `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /ai-2-implement first."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @~/.claude/instructions/caveman.md

Also fetch @~/.claude/instructions/implement.md and follow those instructions exactly, with these REPLACEMENTS:

- Input is the change name `$ARGUMENTS`. The implementation plan lives at `openspec/changes/{change-name}/implementation.md`.
- Every reference to `plan.md` in the loaded instructions resolves to `openspec/changes/{change-name}/implementation.md`.
- For situational status context (which tasks are tracked high-level by OpenSpec), you MAY run `openspec status --change {change-name} --json`. This is read-only context; the granular plan in `implementation.md` is the source of truth for what to do.

Fetch @~/.claude/instructions/remember.md
