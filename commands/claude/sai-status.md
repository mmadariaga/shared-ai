---
description: Read-only progress panel for one OpenSpec change — the 10 sai-workflow artifacts, specs approval, implementation progress, and a Next: hint. Writes nothing.
argument-hint: "[change-name]"
model: haiku
allowed-tools: Read, Glob, Grep, Bash(openspec:*), AskUserQuestion, Skill
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/status/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: status
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
