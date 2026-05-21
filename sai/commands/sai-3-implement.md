# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
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
  Fetch @skills/budget/SKILL.md
  Fetch @skills/caveman/SKILL.md
  Caveman lite mode active by default. If `--full-caveman` appears in arguments, use full instead.

  ## Load instructions (in order)
  Fetch @sai/instructions/glossary-format.md
  Fetch @sai/instructions/implement.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

   MANDATORY STOP: Once `openspec/changes/{change-name}/implementation.md` is written, your work is COMPLETE. Do NOT execute any steps, run verification commands, mark any checkboxes, or modify any project file. That is sai-4-apply's job. STOP and print exactly: "Implementation plan done in openspec/changes/{name}/. Review and run /sai-4-apply {name} when ready."
</TASK>