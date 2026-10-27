---
description: Read-only retrospective on historical SAI command executions — collects the matching sessions and their principal workers, then discusses runtime errors, instruction drift, and improvements. Writes nothing.
argument-hint: "<session-id|sai-command> [--paths \"<p1>,<p2>\"] [--limit <N>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/retrospective/body.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: retrospective
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
