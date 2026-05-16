---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with spec.md, and produces plans/{feature-name}/review.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/caveman.md
Fetch @~/.config/opencode/instructions/glossary-format.md

Also fetch @~/.config/opencode/instructions/review.md and follow those instructions exactly. $ARGUMENTS

Also fetch @~/.config/opencode/instructions/remember.chinese.md