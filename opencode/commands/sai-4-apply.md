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

Also fetch @~/.config/opencode/instructions/sai/apply.md and follow those instructions exactly, with these REPLACEMENTS:

- Input is the change name `$ARGUMENTS`. The implementation plan lives at `openspec/changes/{change-name}/implementation.md`.
- Every reference to `plan.md` in the loaded instructions resolves to `openspec/changes/{change-name}/implementation.md`.
- For situational status context, you MAY run `openspec status --change {change-name} --json`. The granular plan in `implementation.md` is the source of truth.

Fetch @~/.config/opencode/instructions/sai/remember.md
