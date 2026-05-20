---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.config/opencode/skills/caveman/SKILL.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md

Fetch @~/.config/opencode/instructions/sai/review.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.config/opencode/instructions/sai/remember.md
