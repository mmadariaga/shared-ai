---
description: Generate design.md and tasks.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--overview-lang <language>] [--fast-track]"
model: opencode-go/deepseek-v4-flash
variant: max
subtask: false
---

## Sai Design - 2

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.
Fetch @sai/commands/design/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: design
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument and and optional flags:** $ARGUMENTS
