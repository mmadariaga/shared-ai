---
description: Post-hoc backfill — reconstructs proposal.md and capability specs for changes that skipped the SAI workflow.
argument-hint: "<change-name>"
model: sonnet
effort: medium
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/backfill/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: backfill
  arguments_value: $ARGUMENTS
