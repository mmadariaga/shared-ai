<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  ## Fast-track parse
  Before proceeding, inspect the boot-provided `arguments_value` for the positional token `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the in-conversation fast-track signal to active.
    2. Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the fast-track signal inactive.
    2. Use `arguments_value` verbatim.

  ## Load behaviors (in order)
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/policies/change-picker.md and follow it exactly.

  Fetch @sai/commands/archive/instructions.md
  Fetch @sai/policies/remember.md

  Fetch @skills/openspec-archive-change/SKILL.md and follow those instructions exactly.
  Fetch @sai/commands/archive/archive-commit-gate.instructions.md and follow those instructions exactly.

  ## Run
  **User's request:** cleaned boot-provided `arguments_value` after fast-track parse and change-picker resolution
</TASK>

Follow instruction on <TASK> step by step
