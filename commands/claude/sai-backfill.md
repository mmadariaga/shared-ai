---
description: Reconstruct proposal.md and capability specs from an already-implemented diff, for a change that skipped the SAI workflow.
argument-hint: "[change-name] [--staged | --unstaged | --diff <sha>] [--fast-track]"
model: opus
effort: medium
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/backfill/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: backfill
  arguments_value: $ARGUMENTS
