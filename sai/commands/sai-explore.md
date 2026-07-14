# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md
  Fetch @skills/safe-operations/SKILL.md and use it

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
  Fetch @sai/instructions/explore.md
  Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS
</TASK>

Follow instruction on <TASK> step by step
