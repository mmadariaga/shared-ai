---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
argument-hint: "[change-name] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/caveman.md
Fetch @~/.claude/instructions/glossary-format.md

Also fetch @~/.claude/instructions/review.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/review.md`. $ARGUMENTS

Fetch @~/.claude/instructions/remember.md
