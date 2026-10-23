---
description: Write or refine a change's proposal.md and specs/ with no human in the loop, from a /sai-explore Ready to Propose block or from a change name plus feedback. Reviewed, checked, and committed locally; stops before design.
model: opencode-go/muse-spark-1.3-contributor#xhigh
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/spec/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: spec
  arguments_value: $ARGUMENTS
