---
description: Audit a change for performance problems — backend, frontend, database, and queue tiers on the diff vs parent (or --full / --path), optional --runtime diagnostics — into openspec/changes/{change-name}/performance.md. Accepts --full, --path <dir>, --tier <tier>, --runtime, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: --runtime] [optional: --parent-branch <branch>]"
model: sonnet
effort: high
allowed-tools: Read, Glob, Grep, AskUserQuestion, Skill, Agent, SendMessage, TaskCreate, TaskUpdate, TaskGet, TaskList, Bash(node .claude/sai/tools/worker-report-validator.js:*), PowerShell(node .claude/sai/tools/worker-report-validator.js:*), Bash(node ~/.claude/sai/tools/worker-report-validator.js:*), PowerShell(node ~/.claude/sai/tools/worker-report-validator.js:*), Bash(node .claude/sai/tools/no-commit-guard.js:*), PowerShell(node .claude/sai/tools/no-commit-guard.js:*), Bash(node ~/.claude/sai/tools/no-commit-guard.js:*), PowerShell(node ~/.claude/sai/tools/no-commit-guard.js:*), Bash(node .claude/sai/bin/sai-state.js:*), PowerShell(node .claude/sai/bin/sai-state.js:*), Bash(node ~/.claude/sai/bin/sai-state.js:*), PowerShell(node ~/.claude/sai/bin/sai-state.js:*), Bash(git reset:*), PowerShell(git reset:*)
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: performance-command.
Fetch @sai/commands/performance/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: performance
  arguments_value: $ARGUMENTS
