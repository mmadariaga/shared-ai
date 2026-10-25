---
description: Review a change's diff in a fresh worker and write review.md, with no fixes and no human in the loop; /sai-3-implement applies the findings you keep. Accepts --parent-branch <branch>.
model: opencode-go/muse-spark-1.3-contributor#xhigh
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/review/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: review
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
