---
description: Design a change into design.md, tasks.md, and interfaces.md with no human in the loop — running it approves the specs; --overview-lang also writes change-overview.md. Reviewed, checked, and committed locally; stops before /sai-3-implement.
model: opencode-go/muse-spark-1.3-contributor#xhigh
subtask: false
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/design/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: design
  arguments_value: $ARGUMENTS
