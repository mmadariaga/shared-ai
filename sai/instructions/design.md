## Approval gate

Confirm `openspec/changes/$ARGUMENTS/proposal.md` exists AND at least one file matching `openspec/changes/$ARGUMENTS/specs/**/*.md` exists. If either is missing, STOP and print: "Change '$ARGUMENTS' not found or has no specs. Run /sai-1-spec to create it first."

Ask exactly: "**Have you reviewed the specs in openspec/changes/$ARGUMENTS/specs/** and are ready to **approve** them for design? (yes/no, and any notes)"

If the user's response is "no" or any clearly negative answer, STOP without writing any file.

If the user's response is "yes" (with or without notes), write the following fields to `openspec/changes/$ARGUMENTS/.openspec.yaml`, MERGING into the existing file content (preserve any existing top-level keys such as `schema:` and `created:` verbatim — do NOT truncate or rewrite the whole file):

- `approval.specs.approved_at`: current UTC timestamp in ISO 8601 format (e.g. `2026-05-17T14:30:00Z`).
- `approval.specs.notes`: the user's notes verbatim, or empty string if none provided.

Do not create or modify any other files if the user declines.

## Collaboration Style

- Treat the user as a **knowledgeable peer**, not as a requester. They have deep domain expertise and more project context than you. Adjust language accordingly.
- The user may not have fully specified the task upfront — engage in dialogue to uncover the full picture before committing. **Ask questions rather than making assumptions.**
- When multiple valid approaches exist, **discuss trade-offs explicitly with the user** before choosing a direction.
- Prioritize **shared understanding of the WHY**. Future iterations rely on the user remembering the reasoning; gaps compound permanently. Explain non-obvious decisions concisely but clearly.
- When trade offs are discussed, propose **up to 2 concrete scenarios** that probe edge cases. Wait for user feedback before continuing.

## Generation Instructions

Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`. Do NOT regenerate `proposal.md` or `specs/`.

### Inputs

Read the following known files in the main agent (paths are fixed by convention):
- `openspec/changes/$ARGUMENTS/proposal.md` — motivation, what changes, capabilities in scope
- All files matching `openspec/changes/$ARGUMENTS/specs/**/*.md` — capability delta specs

### Codebase Research (DELEGATED)

**ALL** codebase discovery and deep reading MUST be delegated to a **`budget-explorer`** subagent. The main agent MUST NOT run `glob`, `grep`, `Read`, or any file operation on source code.

Launch ONE **`budget-explorer`** subagent with this prompt:

> Read the proposal and specs for change `$ARGUMENTS`. Discover and deeply read the most relevant source files for this change. Search broadly (glob/grep) — do not assume frameworks. For each discovered file, report: `filePath`, `keyExports`, `isReusableForThisChange` (boolean), `notes` (max 20 words). Return structured data only. No prose narrative.

The main agent acts **exclusively** on the `budget-explorer` subagent's output. If the output is ambiguous, spawn another `budget-explorer` subagent with a more targeted prompt. Do NOT open files to "verify".

## Trust Rule

The `budget-explorer` subagent is the single source of truth for codebase facts during design. The main agent MUST NOT re-read any source file the `budget-explorer` has already reported on, even if the report contains something surprising (e.g. "this component has a bug" or "this pattern is unusual"). Assume the `budget-explorer` is correct and design accordingly.

The only exception: files the `budget-explorer` explicitly marks as `NOT_FOUND` or files not in its list (e.g. external URLs, newly created files).

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

### Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), present the question to the user.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or resolved by the user. Incorporate all answers into `design.md` before continuing.

### Generate tasks.md

**Rule of conciseness:** Each step MUST be a planning scaffold, not a restatement of requirements. Do NOT copy scenario text, field names, or detailed behavior from specs into the steps. Instead, reference the relevant spec file and describe ONLY the implementation approach and how it maps to the existing codebase.

Write to `openspec/changes/$ARGUMENTS/tasks.md`.

IMPORTANT: Do NOT use checkbox markers (`- [ ]` or `- [x]`). This file is a planning scaffold, not a progress tracker. Implementation progress is tracked in `implementation.md`.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    **Files Affected**: <comma-separated list of file paths>

    **What Will Be Done**: <prose description of HOW to build it, not WHAT to build>. Reference the relevant `specs/<capability>/spec.md` by path. Do NOT restate requirements already defined there.

    **Testing Strategy**: <how correctness will be verified>

Order steps by dependency. Steps should be small enough to expand into a single `implementation.md` step group.

Reference specs for what to build, design for how to build it.

After all implementation steps, end the file with these two mandatory sections in order:

1. `## Required Documentation` — list every file consulted during design. **Populate this entirely from the `budget-explorer` subagent's report**. Also list every spec file that the steps reference:
   - `### Local files`: one path per line; use line ranges (e.g., `path/to/file.md:10-50`) when only a portion applies; write `None` if empty.
   - `### Spec files`: one path per line to every `specs/**/*.md` consulted. Do NOT leave empty.
   - `### External URLs`: one URL per line; write `None` if empty.
   - Do NOT leave either subsection empty or omit it.

2. `## Implementation Context` — derive all three fields from actual codebase research, not from the change description:
   - `**Stack**`: primary language/framework + key versions relevant to this change.
   - `**Conventions**`: 2–5 project-specific, non-obvious bullets observed in the actual codebase (naming, file organization, error handling, testing idioms). Generic best-practices ("follow SOLID", "write clean code") are NOT acceptable.
   - `**Avoid**`: anti-patterns the implementation agent might default to given the declared stack.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.

## Cost discipline reminder

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md` or a `spec.md`, STOP and delegate to a `budget-explorer` subagent instead.
