---
description: Archive a completed change — wraps opsx:archive skill. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name] [--fast-track]"
model: haiku
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/archive/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: archive
  arguments_value: $ARGUMENTS
