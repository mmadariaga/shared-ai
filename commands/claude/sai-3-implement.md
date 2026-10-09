---
description: Plan a change's implementation into implementation.md — ordered RED→GREEN steps sized for a cheap model to apply. Stops before /sai-4-apply.
argument-hint: "[change-name]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/implement/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement
  arguments_value: $ARGUMENTS
