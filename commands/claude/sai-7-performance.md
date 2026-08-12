---
description: Structured Performance Audit Prompt - backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Performance - 7

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/performance-worker.md and use it.
Fetch @sai/commands/performance/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: performance
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS

**Performance arguments:** $ARGUMENTS
