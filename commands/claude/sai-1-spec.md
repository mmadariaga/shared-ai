---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
argument-hint: "[change name or feature description]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash(date:*)
---
## Sai Spec - 1

Fetch @skills/fetch/SKILL.md
Fetch @sai/policies/glossary-format.md
Fetch @skills/budget/SKILL.md and use it.
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.
Fetch @sai/commands/spec/coordinator.md and follow those instructions exactly.

**Spec request argument:** $ARGUMENTS
