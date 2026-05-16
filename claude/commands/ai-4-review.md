---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with spec.md, and produces plans/{feature-name}/review.md
argument-hint: "[path to spec.md] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/caveman.md
Fetch @~/.claude/instructions/glossary-format.md

Also fetch @~/.claude/instructions/review.md and follow those instructions exactly. $ARGUMENTS

Also fetch @~/.claude/instructions/remember.md
