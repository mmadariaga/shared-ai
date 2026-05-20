---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
argument-hint: "[change-name] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/skills/caveman/SKILL.md
Fetch @~/.claude/instructions/sai/glossary-format.md

Fetch @~/.claude/instructions/sai/review.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
