<TASK>

  ## Artifact paths
  Fetch @sai/policies/prereqs-paths.md

  ## Fast-track parse
  Inspect the boot-provided `arguments_value` for the token `--fast-track`:
  - Present anywhere: set the fast-track session signal active, remove the token and trim the remainder, and print `> FAST-TRACK MODE ACTIVE` once as conversation text. The remainder is the effective request.
  - Absent: set the fast-track session signal explicitly false and use `arguments_value` verbatim.

  This section is the sole authority that detects and removes `--fast-track` on the standalone path. Every later fast-track behavior reads the session signal and never re-parses arguments.

  ## Change resolution
  Fetch @sai/policies/change-picker.md and follow it exactly.

  ## Implementation-plan check
  After change resolution, if `openspec/changes/{change-name}/implementation.md` does not exist, STOP, print "implementation.md not found for '{change-name}'. Run /sai-3-implement first.", and write nothing.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  Fast-track keeps every safe-operations confirmation.

  ## Load instructions (in order)
  Fetch @sai/policies/sai-learnings-format.md
  Fetch @sai/policies/remember.md

  ## Completion
  The run is complete only when both hold:
  - every Step in `implementation.md` has all its **Automated** checkboxes `[x]`, confirmed by the Final sweep; and
  - every commit gate has finished (committed, declined, or no-op).

  Functional checkboxes (legacy header `**Human (...)**`) never gate completion; unmarked ones are reported as pending human review. While any Step still has an unmarked Automated checkbox, the run is not complete: continue the Step loop and do not mention `/sai-5-review` or `/sai-review`.

  When complete, print the terminal print cluster (`sai/commands/apply/steps/terminal-lifecycle.md` § 5) using `@sai/policies/implementation-closing-report.md`. Put this literal in Next step, followed by Execution details as the last report section, then STOP:

  "Implementation applied. In a new chat when ready, run `/sai-5-review {name}` for a general review, or `/sai-review {name}` to add specialized audits based on the initial assessment performed by `/sai-5-review`."
</TASK>

Follow instruction on <TASK> step by step
