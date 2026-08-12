---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
model: opencode-go/deepseek-v4-flash
---

## Sai PR

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.

InvocationEnvelope:
  command_name: pr
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument:** $ARGUMENTS
