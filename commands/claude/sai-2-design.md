---
description: Generate design.md, tasks.md, and interfaces.md through the canonical coordinator contract and a routed design worker.
argument-hint: "[change-name] [--overview-lang <language>] [--fast-track]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, Bash(node .claude/sai/tools/worker-report-validator.js:*), Bash(node ~/.claude/sai/tools/worker-report-validator.js:*), Bash(node .claude/sai/tools/no-commit-guard.js:*), Bash(node ~/.claude/sai/tools/no-commit-guard.js:*), Bash(node .claude/sai/bin/sai-state.js:*), Bash(node ~/.claude/sai/bin/sai-state.js:*)
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/design/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: design
  arguments_value: $ARGUMENTS
