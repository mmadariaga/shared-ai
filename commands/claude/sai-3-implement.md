---
description: Implement a change's plan end to end with no human in the loop — live RED and GREEN workers, per-step tests, and one local commit per step. Accepts --parent-branch <branch>.
argument-hint: "[change-name] [--parent-branch <branch>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch `@skills/fetch/SKILL.md`
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch `@sai/commands/implement/coordinator.md` and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
