---
description: Archive a completed change — wraps opsx:archive skill. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
model: opencode-go/deepseek-v4-flash
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/archive/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: archive
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument and and optional flags:** $ARGUMENTS
