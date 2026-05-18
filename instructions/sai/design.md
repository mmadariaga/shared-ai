# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

## Approval gate

Confirm `openspec/changes/$ARGUMENTS/proposal.md` exists AND at least one file matching `openspec/changes/$ARGUMENTS/specs/**/*.md` exists. If either is missing, STOP and print: "Change '$ARGUMENTS' not found or has no specs. Run /sai-1-spec to create it first."

Ask exactly: "Have you reviewed the specs in openspec/changes/$ARGUMENTS/specs/ and are ready to approve them for design? (yes/no, and any notes)"

If the user's response is "no" or any clearly negative answer, STOP without writing any file.

If the user's response is "yes" (with or without notes), write the following fields to `openspec/changes/$ARGUMENTS/.openspec.yaml`, MERGING into the existing file content (preserve any existing top-level keys such as `schema:` and `created:` verbatim — do NOT truncate or rewrite the whole file):

- `approval.specs.approved_at`: current UTC timestamp in ISO 8601 format (e.g. `2026-05-17T14:30:00Z`).
- `approval.specs.notes`: the user's notes verbatim, or empty string if none provided.

Do not create or modify any other files if the user declines.

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

After all implementation steps, end the file with these two mandatory sections in order:

1. `## Required Documentation` — list every file read and every external URL consulted during design-phase codebase research:
   - `### Local files`: one path per line; use line ranges (e.g., `path/to/file.md:10-50`) when only a portion applies; write `None` if empty.
   - `### External URLs`: one URL per line; write `None` if empty.
   - Do NOT leave either subsection empty or omit it.

2. `## Implementation Context` — derive all three fields from actual codebase research, not from the change description:
   - `**Stack**`: primary language/framework + key versions relevant to this change.
   - `**Conventions**`: 2–5 project-specific, non-obvious bullets observed in the actual codebase (naming, file organization, error handling, testing idioms). Generic best-practices ("follow SOLID", "write clean code") are NOT acceptable.
   - `**Avoid**`: anti-patterns the implementation agent might default to given the declared stack.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.

## Completion

MANDATORY STOP: Once `design.md` and `tasks.md` are written, STOP and print exactly: "Design and tasks ready in openspec/changes/{name}/. Review and run /sai-3-implement {name} when ready."
