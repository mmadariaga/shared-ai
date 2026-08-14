# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Also fetch @sai/commands/worktree/instructions.md and follow those instructions exactly.
  Also fetch @sai/policies/remember.md

  ## Run
  **User's request:** $ARGUMENTS
</TASK>

Follow instruction on <TASK> step by step
