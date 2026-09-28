---
description: Plan and apply a change in one run — /sai-3-implement then /sai-4-apply, with fast-track always on (commits pre-authorized, no stop between phases).
argument-hint: "[change-name]"
model: opus
effort: medium
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/meta-build/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: meta-build
  arguments_value: $ARGUMENTS
