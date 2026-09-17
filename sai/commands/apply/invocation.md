<TASK>

  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  Complete the global OpenSpec prerequisites before any change-specific lookup. This section checks only the OpenSpec binary, project directory, and configured schema; it does not resolve a change or validate a change-specific artifact.

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

  ## Implementation-plan check
  After change resolution, verify the resolved change's implementation plan:
  - `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

  Do not create or modify any files if this post-resolution artifact check fails.

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
  - Every Step in `openspec/changes/{change-name}/implementation.md` has all its **Automated** checkboxes `[x]`, confirmed by the Final sweep, plus a report of any Functional checkbox still pending human review.
  - All commits are done.

  Functional checkboxes (legacy header: `**Human (...)**`) do not gate completion: the terminal functional review marks the ones it verified, and the rest are reported as pending human review. Fast-track has no separate functional-marking branch; the path is identical with and without it.

  Terminal functional review execute lives in `sai/commands/apply/steps/terminal-lifecycle.md` and is not repeated here; this section owns print order only. Emit only the held print cluster as the last consecutive user-visible block before STOP — (a) findings slot (each held fail/unverifiable check with its reason, reported as pending human review, plus one recommendation line in the user input language: Spanish when the user writes Spanish, English fallback; silent when every check passes or there are no Functional checks), then (b) the literal below. Do not re-exercise checks here. Findings are non-blocking warnings and do not change Done above; the synthetic entry completes even with findings. Screen-only, no selector, no extra commit; the review's own Functional checkbox marking already happened at execute. The Final sweep, learnings, visibility listing, and terminal documentation commit occur before this cluster, never between (a) and (b); the literal itself is unchanged.

  If any Step still has an unmarked Automated checkbox, your work is NOT complete: do not print the completion message, do not mention `/sai-5-review`, and do not end — dispatch the next unchecked Step instead. A Step whose Automated checkboxes are all marked is never re-dispatched because a Functional checkbox is still unmarked.

  This section is the sole authority for the standalone completion action. "Done" requires every Step's Automated checkboxes marked and all commits done.

  MANDATORY STOP: Only once all the conditions above hold, your work is COMPLETE, STOP and print exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

  ## Scratch cleanup (non-normative)

  Scratch sweep and exact non-empty trace forms are owned solely by
  `sai/commands/apply/coordinator.md` § Coordinator-Owned Scratch Cleanup.
  This shell card does not redefine those traces.
</TASK>

Follow instruction on <TASK> step by step
