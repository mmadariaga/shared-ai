---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

Fetch @~/.claude/instructions/sai/performance.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
