---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic] [--overview-lang <language>] [--fast-track]"
model: sonnet
effort: medium
allowed-tools: Read, Glob, Grep, Bash(openspec:*), Bash(git:*), AskUserQuestion, Skill, Task, Agent, SendMessage, TodoWrite, TaskCreate, TaskUpdate, TaskGet, TaskList, WebFetch, WebSearch, mcp__codegraph__codegraph_explore
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/adapters/claude/idea-list-render.md and use it.
Fetch @sai/commands/explore/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: explore
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
