---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
argument-hint: "[change-name] [--fast-track]"
model: sonnet
effort: low
---
## Sai Apply - 4

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.

InvocationEnvelope:
  command_name: apply
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
