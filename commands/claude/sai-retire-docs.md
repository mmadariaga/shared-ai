---
description: Find ADRs, DDRs, and the specs that retire with them that may be obsolete, back each with evidence, and archive the ones you confirm. No OpenSpec prerequisite.
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/retire-docs/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: retire-docs
  arguments_value: $ARGUMENTS
