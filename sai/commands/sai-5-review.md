# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  ## Resolve change
  Fetch @sai/policies/change-picker.md and follow it exactly.

  ## Technical review
  Fetch @sai/commands/review/invocation.md and follow it exactly using the resolved change name and optional parent branch as `$ARGUMENTS`.

  ## Completion
  MANDATORY STOP: Once all artifacts are written your work is COMPLETE, STOP and print exactly: "Review done."
</TASK>

Follow instruction on <TASK> step by step
