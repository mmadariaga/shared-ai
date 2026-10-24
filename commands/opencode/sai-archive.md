---
description: Archive a completed change — syncs its delta specs and moves it into the archive through the OpenSpec CLI, then offers a commit.
model: opencode-go/muse-spark-1.3-contributor#xhigh
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/archive/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: archive
  arguments_value: $ARGUMENTS
