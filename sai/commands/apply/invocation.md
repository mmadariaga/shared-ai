<TASK>

  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  Also verify before proceeding:
  - `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

  Do not create or modify any files if this check fails.

  ## Fast-track parse
  Before proceeding, inspect the boot-provided `arguments_value` for the positional token `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the normalized boolean session signal (fast-track signal) to active.
    2. Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` exactly once per run as ordinary conversation text (do not write it to any file); the banner never repeats within the run.
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the normalized boolean session signal (fast-track signal) inactive.
    2. Use `arguments_value` verbatim.

  This section is the sole authority that detects `--fast-track`, removes the token
  from the argument stream before picker/dispatch, and sets the normalized boolean
  session signal on the standalone path. Do not move detect/remove/set into the
  coordinator or runner.

  ## Change resolution
  Fetch @sai/policies/change-picker.md and follow it exactly.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  Fast-track does not bypass safe-operations confirmations: every safe-operations gate stays in force under `--fast-track`.

  ## Load instructions (in order)
  Fetch @sai/policies/sai-learnings-format.md
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** cleaned boot-provided `arguments_value` after fast-track parse and change-picker resolution

  ## Completion
  "Done" means ALL of the following, together — a single Step finishing (or its commit landing) is NOT completion:
  - Every Step in `openspec/changes/{change-name}/implementation.md` has all its checkboxes `[x]`, confirmed by the Final sweep.
  - All human verification gates have been reviewed.
  - All commits are done.

  Under fast-track, the Human Verification evaluation changes: accumulate each Step's Human `- [ ]` checkboxes in the coordinator's in-conversation memory as they are reached, mark them `[x]` after that Step's automated checks pass, and defer presentation to a single combined list printed after the Final sweep and before the MANDATORY STOP. Steps with zero Human checkboxes (italic note only) contribute nothing.

  If any Step remains unchecked, your work is NOT complete: do not print the completion message, do not mention `/sai-5-review`, and do not end — dispatch the next unchecked Step instead.

  This section is the sole authority for the standalone completion action. "Done" requires every Step checked, human verification reviewed, and all commits done (including the fast-track deferred human-check rules above).

  MANDATORY STOP: Only once all the conditions above hold, your work is COMPLETE, STOP and print exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

  ## Scratch cleanup (non-normative)

  Scratch sweep and exact non-empty trace forms are owned solely by
  `sai/commands/apply/coordinator.md` § Coordinator-Owned Scratch Cleanup.
  This shell card does not redefine those traces.
</TASK>

Follow instruction on <TASK> step by step
