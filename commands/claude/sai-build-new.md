---
description: Build a change in one run — /sai-3-implement-new today, with the next position reserved for /sai-4-review (commits pre-authorized, no stop between segments).
argument-hint: "[change-name]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/build-new/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: build-new
  arguments_value: $ARGUMENTS
