---
description: Design a change into design.md, tasks.md, and interfaces.md — running it approves the specs; --overview-lang also writes change-overview.md. Stops before /sai-3-implement.
argument-hint: "[change-name] [--overview-lang <language>] [--fast-track]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/design/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: design
  arguments_value: $ARGUMENTS
