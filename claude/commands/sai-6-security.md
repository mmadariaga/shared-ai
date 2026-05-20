---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
model: claude-opus-4-7
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/skills/caveman/SKILL.md

Fetch @~/.claude/instructions/sai/security.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
