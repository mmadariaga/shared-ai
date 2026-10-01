---
description: Think through an idea, problem, or requirement with a read-only partner until it settles into a Ready to Propose block, then plan it, build it unattended, or hand it off manually. Pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic] [--overview-lang <language>] [--fast-track]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/adapters/claude/idea-list-render.md and use it.
Fetch @sai/commands/explore/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: explore
  arguments_value: $ARGUMENTS
