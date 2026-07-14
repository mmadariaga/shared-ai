# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  ## Fast-track parse
  Before proceeding, inspect `$ARGUMENTS` for the positional token `--fast-track`:
  - If the token is present anywhere in `$ARGUMENTS`:
    1. Set the in-conversation fast-track signal to active.
    2. Remove the `--fast-track` token from `$ARGUMENTS` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the fast-track signal inactive.
    2. Use `$ARGUMENTS` verbatim.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/instructions/change-picker.md and follow it exactly.

  After the change-picker resolves a change name, if the resolved value still contains `--fast-track`:
  1. Remove the token and trim surrounding whitespace.
  2. Use the cleaned remainder as the effective change name for all downstream steps.

  Fetch @sai/instructions/glossary-format.md
  Fetch @sai/instructions/design.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  Before printing the handoff prompt below, print a **decision summary (design phase)** derived exclusively from the artifacts just written (`design.md` and `tasks.md`) — never from prior conversation (Isolation Mode):

  - **Decisions**: one line per decision from `design.md`'s Decisions section. Every `### D<n>` heading under `## Decisions` counts as one decision; sub-elements (`**ADR/DDR criteria**`, `**Alternatives considered**`, `**Chosen**`) are NOT separate decisions.
  - **Risks**: one line per risk from `design.md`'s Risks / Trade-offs section. Each `- **[<Risk>]** → Mitigation:` entry counts as one risk.
  - **Resolved Open Questions**: one line per open question resolved during the design phase (by codebase research or by the user). Omit this block entirely when none were resolved.

  Rules:
  - Every summary line SHALL trace to content in `design.md` or `tasks.md` just written; no information from prior conversation SHALL appear.
  - Hard cap: the summary SHALL NOT exceed 15 non-blank lines (excluding blank separator lines).
  - When decisions + risks + resolved-questions items exceed the cap, compress by trimming only the largest block(s) — preserve Decisions before Risks before Resolved Open Questions — and reserve one slot for a single trailing signal line `+N more — see openspec/changes/{name}/design.md` (N = count of omitted items). Silent drops are forbidden.
  - When items fit within the cap, print exactly one line per item with no `+N more` signal.

  Contract: the `design-quality` capability spec (`openspec/specs/design-quality/spec.md`).

  After the decision summary, present the feedback gate: Fetch @sai/instructions/artifact-feedback-gate.md and follow it exactly, supplying — artifacts = `design.md`, `tasks.md`, `interfaces.md`; proceed-label = `Continue`; next-action = advance to the (a)/(b) implementation-continuation question below. Present the (a)/(b) question only after the user selects `Continue`.

  Once all artifacts are written, ask the user how to proceed to implementation:
  (a) **Stop for a new chat (Recommended)** — isolated; use a cheaper model for `/sai-3-implement {name}` (the standard pipeline path).
  (b) **Continue now in this chat** — create the implementation plan with the current model, keeping this design context. Note: this is cheaper than running an independent `/sai-3-implement` with the same model, but more expensive than using the default `/sai-3-implement` model — a good choice for complex implementations.

  - If the user chooses (a): MANDATORY STOP. Your work is COMPLETE. STOP and print exactly: "Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready."
  - If the user chooses (b): Ask the user to review `design.md`, `tasks.md`, and `interfaces.md` before continuing, and STOP until they confirm. Once they confirm, re-read `design.md`, `tasks.md`, and `interfaces.md` from disk (they may have changed during review or a gate iteration), then Fetch @sai/instructions/implement-invocation.md and follow it exactly (Load instructions, Run, Completion), using {name} as $ARGUMENTS. Do NOT proceed past its Completion (that is sai-4-apply's job).
</TASK>

Follow instruction on <TASK> step by step
