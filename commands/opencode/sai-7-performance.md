---
description: Structured Performance Audit Prompt - backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
model: opencode-go/qwen3.7-plus
variant: high
---

## Sai Performance - 7

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/performance-worker.md and use it.
Fetch @sai/commands/performance/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: performance
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Performance arguments:** $ARGUMENTS
