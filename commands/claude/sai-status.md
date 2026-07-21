---
description: Read-only progress panel for one OpenSpec change — the 10 sai-workflow artifacts, specs approval, implementation progress, and a Next: hint. Writes nothing.
argument-hint: "[change-name]"
model: claude-haiku-4-5
allowed-tools: Read, Glob, Grep, Bash(openspec:*), AskUserQuestion, Skill
---
## Sai Status

Fetch @skills/fetch/SKILL.md
Fetch @sai/commands/sai-status.md and follow those instructions exactly.
