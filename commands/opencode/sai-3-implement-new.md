---
description: Implement a change's plan end to end with no human in the loop — live RED and GREEN workers, per-step tests, and one local commit per step.
model: opencode-go/muse-spark-1.3-contributor#xhigh
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/implement-new/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement-new
  arguments_value: $ARGUMENTS
