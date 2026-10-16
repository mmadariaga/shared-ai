---
description: Build a change in one run — /sai-3-implement-new then /sai-4-review-new, closing with a findings summary for you to triage (commits pre-authorized, no stop between segments).
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
