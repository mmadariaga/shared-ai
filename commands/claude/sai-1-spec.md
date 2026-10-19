---
description: Write or refine a change's proposal.md and specs/ from a /sai-explore Ready to Propose block, or from a change name plus feedback. Stops before design; running /sai-2-design approves the specs.
argument-hint: "[Ready to Propose block | change name + feedback]"
model: sonnet
effort: high
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/spec/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: spec
  arguments_value: $ARGUMENTS
