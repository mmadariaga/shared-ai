---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
model: opencode-go/deepseek-v4-flash
variant: max
---

## Sai Apply - 4

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.

InvocationEnvelope:
  command_name: apply
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument and and optional flags:** $ARGUMENTS
