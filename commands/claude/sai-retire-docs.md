---
description: Find ADRs, DDRs, and the specs that retire with them that may be obsolete, back each with evidence, and archive the ones you confirm. No OpenSpec prerequisite.
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/retire-docs/body.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: retire-docs
  arguments_value: $ARGUMENTS
