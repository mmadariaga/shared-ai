---
description: Plan a change in one run — /sai-1-spec then /sai-2-design from a Ready to Propose block, each segment reviewed, checked, and committed locally, with no stop between segments.
argument-hint: "[Ready to Propose block | --block-file <path> --block-hash <sha256> | change-name] [--overview-lang <language>]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/plan/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: plan
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
