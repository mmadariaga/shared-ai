---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/explorer.opencode.md
Fetch @~/.config/opencode/instructions/sai/caveman.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md
Fetch @~/.config/opencode/instructions/sai/spec.propose.md

Then fetch and follow the openspec-propose skill at `.opencode/skills/openspec-propose/SKILL.md` exactly, with this OVERRIDE:

- Generate ONLY `proposal.md` and `specs/**/*.md`. Do NOT generate `design.md` or `tasks.md`.
- After all spec files are written, STOP and print exactly:
  "Specs ready in openspec/changes/{name}/. Review them and run /sai-2-design {name} when ready."

User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md