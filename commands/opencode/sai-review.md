---
description: Run review and conditionally dispatch recommended audits in one routed composition.
model: opencode-go/deepseek-v4-flash
variant: max
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/meta-review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: meta-review
  arguments_value: $ARGUMENTS
