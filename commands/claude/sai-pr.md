---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
argument-hint: "[change-name] [optional: parent branch]"
model: haiku
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/pr/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: pr
  arguments_value: $ARGUMENTS
