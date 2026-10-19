---
description: Reconstruct proposal.md and capability specs from an already-implemented diff, for a change that skipped the SAI workflow.
argument-hint: "[change-name] [--staged | --unstaged | --diff <sha>] [--fast-track]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/backfill/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: backfill
  arguments_value: $ARGUMENTS
