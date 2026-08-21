---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
model: opus
effort: xhigh
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/security/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: security
  arguments_value: $ARGUMENTS
