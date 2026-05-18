---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
argument-hint: "[change name or feature description]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/explorer.claude.md
Fetch @~/.claude/instructions/sai/caveman.md
Fetch @~/.claude/instructions/sai/glossary-format.md
Fetch @~/.claude/instructions/sai/spec.propose.md

Fetch the openspec-propose skill at `.claude/skills/openspec-propose/SKILL.md` and follow those instructions exactly. User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
