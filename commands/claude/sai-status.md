---
description: Read-only progress panel for one OpenSpec change — the 10 sai-workflow artifacts, specs approval, implementation progress, and a Next: hint. Writes nothing.
argument-hint: "[change-name]"
model: haiku
allowed-tools: Read, Glob, Grep, Bash(openspec:*), AskUserQuestion, Skill
---
## Sai Status

Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.

InvocationEnvelope:
  command_name: status
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
