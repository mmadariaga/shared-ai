---
description: Generate design.md and tasks.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--overview-lang <language>] [--fast-track]"
model: opencode-go/deepseek-v4-flash
variant: max
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/design/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: design
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS
