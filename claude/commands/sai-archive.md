---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

## Completion Check

Before running the archive skill, perform this check:

1. Check if `openspec/changes/$ARGUMENTS/implementation.md` exists.
   - **If it exists**: search it for unchecked items (`- [ ]`). If any are found, STOP and print: "openspec/changes/$ARGUMENTS/implementation.md contains incomplete tasks. Complete all steps before archiving." Do not proceed with the archive.
   - **If it does not exist**: skip this check entirely. Proceed without any warning about incomplete tasks.

Then fetch and follow the openspec-archive-change skill at `.claude/skills/openspec-archive-change/SKILL.md` exactly. User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
