---
description: Post-hoc backfill — reconstructs proposal.md and capability specs for changes that skipped the SAI workflow.
argument-hint: "<change-name>"
model: sonnet
effort: medium
---
## Sai Backfill

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.

InvocationEnvelope:
  command_name: backfill
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
