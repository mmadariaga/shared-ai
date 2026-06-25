# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/instructions/glossary-format.md
  Fetch @sai/instructions/spec.propose.md
  Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  Before printing the stop message below, print a **decision summary (spec phase)** derived exclusively from the artifacts just written (`proposal.md` and `specs/**/*.md`) — never from prior conversation (Isolation Mode):

  - **Scope**: one line per capability listed in `proposal.md`'s Capabilities section (new and modified). Omit the block entirely when there are no capabilities.
  - **Requirements**: one line per requirement across `specs/**/*.md`, grouped by capability. Omit an empty Requirements block entirely; do not print an empty block header.

  Rules:
  - Every summary line SHALL trace to content in `proposal.md` or `specs/**/*.md` just written; no information from prior conversation SHALL appear.
  - Hard cap: the summary SHALL NOT exceed 15 non-blank lines (excluding blank separator lines).
  - When scope + requirements items exceed the cap, compress by trimming only the largest block(s) — preserve capabilities (Scope) before requirements — and reserve one slot for a single trailing signal line `+N more — see openspec/changes/{name}/specs/**` (N = count of omitted items). Silent drops are forbidden.
  - When items fit within the cap, print exactly one line per item with no `+N more` signal.

  Contract: the `spec-quality` capability spec (`openspec/specs/spec-quality/spec.md`).

  MANDATORY STOP: Once all artifacts are written your work is COMPLETE, STOP and print exactly: "Spec proposal done in openspec/changes/{name}/. Review it and run `/sai-2-design {name}` **in a new chat** when ready."
</TASK>

Follow instruction on <TASK> step by step
