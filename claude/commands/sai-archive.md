---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md
Fetch @~/.claude/instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at `.claude/skills/openspec-archive-change/SKILL.md` exactly. User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
