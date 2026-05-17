---
description: Generate design.md and tasks.md for an approved change — gated on specs approval recorded by /sai-1-spec.
model: opencode/glm-5.1
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/.openspec.yaml` exists AND contains `approval.specs.approved_at`. If not, STOP and print: "Specs not yet approved for '{change-name}'. Review openspec/changes/{change-name}/specs/ and confirm approval before running /sai-2-design."

Do not create or modify any files if this check fails.

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/caveman.md
Fetch @~/.config/opencode/instructions/sai/glossary-format.md

Then fetch and follow the openspec-continue skill at `.opencode/skills/openspec-continue/SKILL.md` exactly, with this OVERRIDE:

- Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`.
- Use proposal.md and specs/**/*.md as inputs.
- Do NOT regenerate proposal.md or specs/.

Fetch @~/.config/opencode/instructions/sai/remember.md
