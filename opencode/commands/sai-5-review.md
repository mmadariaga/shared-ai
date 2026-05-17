---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/caveman.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md

Also fetch @~/.config/opencode/instructions/sai/review.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/review.md`. $ARGUMENTS
