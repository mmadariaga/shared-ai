---
description: Apply a change's implementation.md step by step — budget-tier workers write each step's failing test, then the code, with a commit gate after every step.
argument-hint: "[change-name] [--fast-track]"
model: opus
effort: medium
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/apply/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: apply
  arguments_value: $ARGUMENTS
