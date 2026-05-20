---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/performance.md and follow those instructions exactly. $ARGUMENTS

Fetch @instructions/sai/remember.md
