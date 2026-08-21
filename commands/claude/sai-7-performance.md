---
description: Structured Performance Audit Prompt - backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/performance/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: performance
  arguments_value: $ARGUMENTS
