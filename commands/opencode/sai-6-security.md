---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
model: opencode-go/qwen3.7-plus
---

## Sai Security - 6

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/security-worker.md and use it.
Fetch @sai/commands/security/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: security
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Security arguments:** $ARGUMENTS
