---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
model: opencode-go/qwen3.7-plus
---

## Sai Review - 5

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.
Fetch @sai/commands/review/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: review
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name and optional parent-branch argument:** $ARGUMENTS
