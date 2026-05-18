---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
model: opencode-go/deepseek-v4-flash
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

Do not create or modify any files if this check fails.

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/caveman.md

Fetch @~/.config/opencode/instructions/sai/apply.md and follow those instructions exactly. User input: $ARGUMENTS

Fetch @~/.config/opencode/instructions/sai/remember.md
