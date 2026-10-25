---
description: Commit the staged changes with a Conventional Commits message — drafts the subject (≤50 chars) and optional body, and commits only after you authorize it.
argument-hint: "[optional: --scope X --type Y --no-body --amend]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/commit/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: commit
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
