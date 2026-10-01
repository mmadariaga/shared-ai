---
description: Review a change, run the security / performance / accessibility audits the review recommends, and optionally fix the findings with Direct Build (one local commit).
argument-hint: "[change-name]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/meta-review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: meta-review
  arguments_value: $ARGUMENTS
