---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
argument-hint: "[change-name] [--fast-track]"
model: sonnet
effort: low
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/apply/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: apply
  arguments_value: $ARGUMENTS
