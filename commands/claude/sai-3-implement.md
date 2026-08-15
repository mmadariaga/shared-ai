---
description: Granular implementation plan through the canonical coordinator contract and a routed worker.
argument-hint: "[change-name]"
model: opus
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/implement/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
