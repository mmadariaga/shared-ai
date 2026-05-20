---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
argument-hint: "[change name or feature description]"
model: claude-sonnet-4-6
effort: high
---

Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md
Fetch @instructions/sai/spec.propose.md

Fetch the openspec-propose skill at @skills/openspec-propose/SKILL.md and follow those instructions exactly. User input: $ARGUMENTS

Fetch @instructions/sai/remember.md
