---
description: Generate design.md and tasks.md for a change through a routed design coordinator and planning worker.
argument-hint: "[change-name] [--fast-track]"
model: claude-opus-4-8
effort: low
allowed-tools: Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Design - 2

Fetch @skills/fetch/SKILL.md
Fetch @skills/sai-design-planning-worker/SKILL.md and use it.
Fetch @skills/sai-implementation-planning-worker/SKILL.md and use it.
Fetch @sai/commands/sai-2-design.md and follow those instructions exactly.
