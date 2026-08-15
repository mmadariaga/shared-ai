---
description: Post-hoc backfill — reconstructs proposal.md and capability specs for changes that skipped the SAI workflow.
model: opencode-go/minimax-m3
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/backfill/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: backfill
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS
