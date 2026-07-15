# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/instructions/backfill.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  MANDATORY STOP: Once all backfill artifacts are written your work is COMPLETE. Do NOT run reviews, security audits, or any other command. STOP and print exactly: "Backfill complete in openspec/changes/{name}/."
  ## Ready to Archive

  **Change name**: {name}
  **Open a new chat** and run `/sai-archive {name}` (--fast-track).
</TASK>

Follow instruction on <TASK> step by step
