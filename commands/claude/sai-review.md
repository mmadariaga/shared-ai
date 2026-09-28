---
description: Review a change, run the security / performance / accessibility audits the review recommends, and optionally fix the findings with Direct Build (one local commit).
argument-hint: "[change-name]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, Bash(node .claude/sai/tools/worker-report-validator.js:*), Bash(node ~/.claude/sai/tools/worker-report-validator.js:*), Bash(node .claude/sai/tools/no-commit-guard.js:*), Bash(node ~/.claude/sai/tools/no-commit-guard.js:*), Bash(node .claude/sai/bin/sai-state.js:*), Bash(node ~/.claude/sai/bin/sai-state.js:*), Bash(git reset:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*)
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Fetch @sai/commands/meta-review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: meta-review
  arguments_value: $ARGUMENTS
