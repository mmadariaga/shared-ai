---
description: Generate design.md and tasks.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--overview-lang <language>] [--fast-track]"
model: claude-opus-4-8
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)
---
## Sai Design - 2

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.
Fetch @sai/commands/design/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: design
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
