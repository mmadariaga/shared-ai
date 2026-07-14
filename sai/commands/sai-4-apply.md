# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/instructions/change-picker.md and follow it exactly.

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  Also verify before proceeding:
  - `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

  Do not create or modify any files if this check fails.

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

  After the change-picker resolves a change name, if the resolved value still contains `--fast-track`:
  1. Remove the token and trim surrounding whitespace.
  2. Use the cleaned remainder as the effective change name for all downstream steps.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/instructions/apply.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  "Done" means ALL of the following, together — a single Step finishing (or its commit landing) is NOT completion:
  - Every Step in `openspec/changes/{change-name}/implementation.md` has all its checkboxes `[x]`, confirmed by the Final sweep.
  - All human verification gates have been reviewed.
  - All commits are done.

  Under fast-track, the Human Verification evaluation changes: accumulate each Step's Human `- [ ]` checkboxes in the coordinator's in-conversation memory as they are reached, mark them `[x]` after that Step's automated checks pass, and defer presentation to a single combined list printed after the Final sweep and before the MANDATORY STOP. Steps with zero Human checkboxes (italic note only) contribute nothing. Wait for the user to review the combined list before declaring completion.

  If any Step remains unchecked, your work is NOT complete: do not print the completion message, do not mention `/sai-5-review`, and do not end — dispatch the next unchecked Step instead.

  MANDATORY STOP: Only once all the conditions above hold, your work is COMPLETE, STOP and print exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."
</TASK>

Follow instruction on <TASK> step by step
