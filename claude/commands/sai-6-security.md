---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
model: claude-opus-4-7
effort: high
---

Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/security.md and follow those instructions exactly. $ARGUMENTS

Fetch @instructions/sai/remember.md
