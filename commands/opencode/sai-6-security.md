---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
model: opencode-go/qwen3.7-plus
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/security/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: security
  arguments_value: $ARGUMENTS
