---
description: Write or refine a change's proposal.md and specs/ with no human in the loop, from a /sai-explore Ready to Propose block or from a change name plus feedback. Reviewed, checked, and committed locally; stops before design.
argument-hint: "[Ready to Propose block | --block-file <path> --block-hash <sha256> | change name + feedback]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/spec/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: spec
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
