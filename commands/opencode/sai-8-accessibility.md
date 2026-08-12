---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
model: opencode-go/qwen3.7-plus
variant: high
---

## Sai Accessibility - 8

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/accessibility-worker.md and use it.
Fetch @sai/commands/accessibility/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: accessibility
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Change-name argument:** $ARGUMENTS
