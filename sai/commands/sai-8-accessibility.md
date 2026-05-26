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

  ## Load instructions (in order)
  Fetch @sai/instructions/accessibility.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's accessibility audit request:** $ARGUMENTS

  ## Completion
  MANDATORY STOP: Once all artifacts are written your work is COMPLETE, STOP and print exactly: "Accessibility audit done."
</TASK>

Follow instruction on <TASK> step by step
