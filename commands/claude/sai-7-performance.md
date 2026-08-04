---
description: Structured Performance Audit Prompt - backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: opus
effort: medium
allowed-tools: Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Performance - 7

Fetch @skills/fetch/SKILL.md
Fetch @skills/sai-7-performance-worker/SKILL.md and use it.
Fetch @sai/commands/performance/coordinator.md and follow those instructions exactly.

**Performance arguments:** $ARGUMENTS
