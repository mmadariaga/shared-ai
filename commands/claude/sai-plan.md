---
description: Plan a change in one run — /sai-1-spec then /sai-2-design from a change document, each segment reviewed, checked, and committed locally, with no stop between segments.
argument-hint: "[change document | --document-file <path> --document-hash <sha256> | change-name] [--publish [yes|no|draft]] [--build-publish <yes|no|draft>]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch `@skills/fetch/SKILL.md`
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch `@sai/commands/plan/coordinator.md` and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: plan
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
