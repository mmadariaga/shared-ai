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
  Fetch @sai/instructions/glossary-format.md
  Fetch @sai/instructions/design.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  Once all artifacts are written, ask the user how to proceed to implementation:
  (a) **Continue now in this chat** — same model, keeps this design context (no isolation; the design conversation carries over).
  (b) **Stop for a new chat** — isolated; lets the user pick a cheaper model for `/sai-3-implement {name}` (the standard pipeline path).

  - If the user chooses (b): MANDATORY STOP. Your work is COMPLETE. STOP and print exactly: "Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready."
  - If the user chooses (a): Fetch @sai/instructions/implement-invocation.md and follow it exactly (Load instructions, Run, Completion), using {name} as $ARGUMENTS. Do NOT proceed past its Completion (that is sai-4-apply's job).
</TASK>

Follow instruction on <TASK> step by step
