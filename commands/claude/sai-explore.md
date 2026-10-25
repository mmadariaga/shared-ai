---
description: Think through an idea, problem, or requirement with a read-only partner until it settles into a Ready to Propose block, then plan it, build it unattended, or hand it off manually. Pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic] [--overview-lang <language>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Receipt: check the load receipt at the start of every explore turn and finish the load first when it is missing; the rule lives in @sai/commands/explore/body.md § Load receipt.
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/adapters/claude/idea-list-render.md and use it.
Fetch @sai/commands/explore/body.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: explore
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
