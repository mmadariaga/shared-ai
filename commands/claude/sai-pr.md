---
description: Write a change's pull request from its OpenSpec artifacts and its diff vs parent into openspec/changes/{change-name}/pr.md, then open it with gh once you authorize it.
argument-hint: "[change-name] [optional: parent branch]"
model: sonnet
effort: medium
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/pr/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: pr
  arguments_value: $ARGUMENTS
