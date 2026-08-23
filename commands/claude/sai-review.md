---
description: Run review and conditionally dispatch recommended audits in one routed composition.
argument-hint: "[change-name]"
model: opus
effort: low
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/meta-review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: meta-review
  arguments_value: $ARGUMENTS
