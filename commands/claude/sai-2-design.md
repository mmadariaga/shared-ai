---
description: Generate design.md and tasks.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--fast-track]"
model: claude-opus-4-8
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)
---
## Sai Design - 2

Fetch @skills/fetch/SKILL.md
Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.
Fetch @sai/commands/design/coordinator.md and follow those instructions exactly.
