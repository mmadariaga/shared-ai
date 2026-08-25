---
description: Analyze active ADRs, DDRs, and related specifications for bounded, confirmation-gated archival. No OpenSpec prerequisite.
model: haiku
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion, Skill
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/retire-docs/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: retire-docs
  arguments_value: $ARGUMENTS
