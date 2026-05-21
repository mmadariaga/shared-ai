# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md
  Fetch @skills/caveman/SKILL.md
  Caveman lite mode active by default. If `--full-caveman` appears in arguments, use full instead.

  ## Load instructions (in order)
  Also fetch @sai/instructions/commit.md and follow those instructions exactly.
  Also fetch @sai/instructions/remember.md

  ## Run
  > **Scope reminder (read before every response):** Your only deliverable is the proposed commit message and — only with explicit authorization — the `git commit` invocation. Do not stage, do not unstage, do not push, do not modify code.

  **User's commit request:** $ARGUMENTS
</TASK>