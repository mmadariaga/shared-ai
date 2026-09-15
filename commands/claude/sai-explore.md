---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic] [--overview-lang <language>] [--fast-track]"
model: opus
effort: medium
allowed-tools: Read, Glob, Grep, Bash(openspec:*), Bash(git:*), Bash(node .claude/sai/tools/prereqs.js:*), Bash(node ~/.claude/sai/tools/prereqs.js:*), Bash(node .claude/sai/tools/research-tools-check.js:*), Bash(node ~/.claude/sai/tools/research-tools-check.js:*), Bash(node .claude/sai/bin/sai-state.js:*), Bash(node ~/.claude/sai/bin/sai-state.js:*), AskUserQuestion, Skill, Task, Agent, SendMessage, TodoWrite, TaskCreate, TaskUpdate, TaskGet, TaskList, WebFetch, WebSearch, mcp__codegraph__codegraph_explore
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/adapters/claude/idea-list-render.md and use it.
Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.
Fetch @sai/commands/explore/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: explore
  arguments_value: $ARGUMENTS
