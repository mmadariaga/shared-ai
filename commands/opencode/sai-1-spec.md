---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
model: opencode-go/deepseek-v4-flash
variant: max
---

## Sai Spec - 1

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/policies/glossary-format.md
Fetch @skills/budget/SKILL.md and use it.
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.
Fetch @sai/commands/spec/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  command_name: spec
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS

**Spec request argument:** $ARGUMENTS
