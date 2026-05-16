---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces plans/{feature-name}/security.md
argument-hint: "[path to spec.md] [optional: --full | --path {dir}] [optional: parent branch]"
model: claude-opus-4-7
effort: high
---

Fetch @~/.claude/instructions/caveman.md

Also fetch @~/.claude/instructions/security.md and follow those instructions exactly. $ARGUMENTS

Also fetch @~/.claude/instructions/remember.md
