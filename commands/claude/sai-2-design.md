---
description: Generate design.md and tasks.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--fast-track]"
model: claude-opus-4-8
effort: low
allowed-tools: Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Design - 2

Fetch @skills/fetch/SKILL.md
Fetch @skills/sai-2-design-worker/SKILL.md and use it.
Fetch @sai/commands/sai-2-design.md and follow those instructions exactly.
