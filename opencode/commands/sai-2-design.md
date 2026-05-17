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

## Generation Instructions

Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`. Do NOT regenerate `proposal.md` or `specs/`.

### Inputs

Read the following files in parallel:
- `openspec/changes/$ARGUMENTS/proposal.md` — motivation, what changes, capabilities in scope
- All files matching `openspec/changes/$ARGUMENTS/specs/**/*.md` — capability delta specs

### Generate design.md

Write to `openspec/changes/$ARGUMENTS/design.md`.

Required sections:
- **Context**: background, current state, constraints
- **Goals / Non-Goals**: what this design achieves and explicitly excludes
- **Decisions**: key technical choices. For each decision, evaluate three ADR/DDR criteria:
    1. Hard to reverse — would changing later be costly?
    2. Surprising without context — would a future reader ask "why did they do it this way"?
    3. Real trade-off — were genuine alternatives available?
  If all three apply, document alternatives-considered and rationale for the chosen approach.
- **Risks / Trade-offs**: known limitations; format: [Risk] → Mitigation
- **Migration Plan**: deploy steps, rollback strategy (if applicable)
- **Open Questions**: outstanding unknowns to resolve

Reference `proposal.md` for motivation, `specs/**/*.md` for requirements.

### Generate tasks.md

Write to `openspec/changes/$ARGUMENTS/tasks.md`.

IMPORTANT: Do NOT use checkbox markers (`- [ ]` or `- [x]`). This file is a planning scaffold, not a progress tracker. Implementation progress is tracked in `implementation.md`.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    **Files Affected**: <comma-separated list of file paths>

    **What Will Be Done**: <prose description of the work>

    **Testing Strategy**: <how correctness will be verified>

Order steps by dependency. Steps should be small enough to expand into a single `implementation.md` step group.

Reference specs for what to build, design for how to build it.

Fetch @~/.config/opencode/instructions/sai/remember.md
