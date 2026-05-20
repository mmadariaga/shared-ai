---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
argument-hint: "[change-name] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md

Fetch @instructions/sai/review.md and follow those instructions exactly. $ARGUMENTS

Fetch @instructions/sai/remember.md
