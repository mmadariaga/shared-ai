---
description: Reconstruct proposal.md and capability specs from an already-implemented diff, for a change that skipped the SAI workflow.
argument-hint: "[change-name] [--staged | --unstaged | --diff <sha>] [--fast-track]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/backfill/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: backfill
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
