---
description: Audit a change's UI against WCAG 2.2 AA — static review of the diff vs parent (or --full / --path), optional --runtime axe/pa11y/Lighthouse — into openspec/changes/{change-name}/accessibility.md, with no human in the loop. Accepts --full, --path <dir>, --runtime, --url <url>, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: --url <url>] [optional: --parent-branch <branch>]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/audit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: accessibility
  arguments_value: $ARGUMENTS
