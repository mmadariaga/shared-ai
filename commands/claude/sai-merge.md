---
description: Merge, rebase, or squash-rebase a branch — resolves all conflicts, reports unavailable tests, and finalizes locally automatically; fast-track applies presented strategies without approval.
argument-hint: "[--fast-track]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/merge/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: merge
  arguments_value: $ARGUMENTS
