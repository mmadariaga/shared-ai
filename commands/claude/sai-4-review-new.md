---
description: Review a change's diff in a fresh worker and write review.md, with no fixes and no human in the loop; /sai-3-implement-new applies the findings you keep.
argument-hint: "[change-name] [--parent-branch <branch>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/review-new/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: review-new
  arguments_value: $ARGUMENTS
