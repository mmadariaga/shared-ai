# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/instructions/prereqs.md

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md
  Fetch @skills/caveman/SKILL.md
  Caveman lite mode active by default. If `--full-caveman` appears in arguments, use full instead.

  ## Load instructions (in order)
  Fetch @sai/instructions/glossary-format.md
  Fetch @sai/instructions/spec.propose.md
  Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.
  Fetch @sai/instructions/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Completion
  MANDATORY STOP: Once implementation is done, STOP and print exactly: "Spec proposal done in openspec/changes/{name}/. Run `/sai-2-design {name}` **in a new chat** when ready."
</TASK>
