---
description: Audit a change's UI against WCAG 2.2 AA — static review of the diff vs parent (or --full / --path), optional --runtime axe/pa11y/Lighthouse — into openspec/changes/{change-name}/accessibility.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: parent branch]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/accessibility/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: accessibility
  arguments_value: $ARGUMENTS
