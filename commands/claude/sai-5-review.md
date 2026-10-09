---
description: Review a change's diff against its OpenSpec artifacts into review.md, recommend security/performance/accessibility audits, and optionally fix the findings with Direct Build (one local commit).
argument-hint: "[change-name] [optional: parent branch]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: review
  arguments_value: $ARGUMENTS
