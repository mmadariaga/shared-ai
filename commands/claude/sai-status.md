---
description: Read-only progress panel for one OpenSpec change — the 10 sai-workflow artifacts, specs approval, implementation progress, and a Next: hint. Writes nothing.
argument-hint: "[change-name]"
model: sonnet
effort: medium
allowed-tools: Read, Glob, Grep, Bash(openspec:*), Bash(node .claude/sai/tools/change-picker.js:*), Bash(node ~/.claude/sai/tools/change-picker.js:*), Bash(node .claude/sai/tools/status.js:*), Bash(node ~/.claude/sai/tools/status.js:*), AskUserQuestion, Skill
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/status/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: status
  arguments_value: $ARGUMENTS
