---
description: Granular implementation plan through the canonical coordinator contract and a routed worker.
argument-hint: "[change-name]"
model: opus
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)
---
## Sai Implement - 3

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.
Fetch @sai/commands/implement/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: implement
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
