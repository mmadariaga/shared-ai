# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  Also verify before proceeding:
  - `openspec/changes/{change-name}/proposal.md` exists. If not, STOP and print: "Change '{change-name}' not found. Run /sai-1-spec to create it first."
  - `openspec/changes/{change-name}/design.md` exists. If not, STOP and print: "design.md not found for '{change-name}'. Run /sai-2-design first."

  Do not create or modify any files if any check fails.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it

  ## Invoke implementation
  Fetch @sai/instructions/implement-invocation.md and follow it exactly (Load instructions, Run, Completion).
</TASK>

Follow instruction on <TASK> step by step
