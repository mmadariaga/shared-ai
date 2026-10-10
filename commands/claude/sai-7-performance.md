---
description: Audit a change for performance problems — backend, frontend, database, and queue tiers on the diff vs parent (or --full / --path), optional --runtime diagnostics — into openspec/changes/{change-name}/performance.md. Accepts --full, --path <dir>, --tier <tier>, --runtime, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: --runtime] [optional: --parent-branch <branch>]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/performance/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: performance
  arguments_value: $ARGUMENTS
