---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
model: opencode-go/deepseek-v4-flash
variant: max
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/spec/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: spec
  arguments_value: $ARGUMENTS
