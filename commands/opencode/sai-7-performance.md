---
description: Structured Performance Audit Prompt - backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
model: opencode-go/qwen3.7-plus
variant: high
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/performance/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: performance
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Performance arguments:** $ARGUMENTS
