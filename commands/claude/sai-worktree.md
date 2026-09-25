---
description: Manage linked git worktrees — list them, then safely create or delete them from a selector loop. No OpenSpec prerequisite.
model: sonnet
effort: medium
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(node .claude/sai/tools/worktree.js:*), Bash(node ~/.claude/sai/tools/worktree.js:*), AskUserQuestion, Skill
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/worktree/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: worktree
  arguments_value: $ARGUMENTS
