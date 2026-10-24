---
description: Audit a change's UI against WCAG 2.2 AA — static review of the diff vs parent (or --full / --path), optional --runtime axe/pa11y/Lighthouse — into openspec/changes/{change-name}/accessibility.md. Accepts --full, --path <dir>, --runtime, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: --parent-branch <branch>]"
model: sonnet
effort: high
allowed-tools: Read, Glob, Grep, AskUserQuestion, Skill, Agent, SendMessage, TaskCreate, TaskUpdate, TaskGet, TaskList, Bash(node .claude/sai/tools/worker-report-validator.js:*), PowerShell(node .claude/sai/tools/worker-report-validator.js:*), Bash(node ~/.claude/sai/tools/worker-report-validator.js:*), PowerShell(node ~/.claude/sai/tools/worker-report-validator.js:*), Bash(node .claude/sai/tools/no-commit-guard.js:*), PowerShell(node .claude/sai/tools/no-commit-guard.js:*), Bash(node ~/.claude/sai/tools/no-commit-guard.js:*), PowerShell(node ~/.claude/sai/tools/no-commit-guard.js:*), Bash(node .claude/sai/bin/sai-state.js:*), PowerShell(node .claude/sai/bin/sai-state.js:*), Bash(node ~/.claude/sai/bin/sai-state.js:*), PowerShell(node ~/.claude/sai/bin/sai-state.js:*), Bash(git reset:*), PowerShell(git reset:*)
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: accessibility-command.
Fetch @sai/commands/accessibility/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: accessibility
  arguments_value: $ARGUMENTS
