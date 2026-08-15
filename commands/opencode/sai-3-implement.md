---
description: Granular implementation plan through the canonical coordinator contract and a routed worker.
model: opencode-go/deepseek-v4-flash
variant: max
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/implement/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument:** $ARGUMENTS
